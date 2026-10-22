import { ConfigService } from '@nestjs/config';
import { BookingForwardService } from './booking-forward.service';
import type { GmailAuthService } from '@/ingestion/gmail-auth.provider';
import type { PrismaService } from '@/prisma/prisma.service';

const MAILBOX = 'tracked@example.com';

function makeService(env: Record<string, string | undefined>) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  const prisma = {
    gmailAccount: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ refreshToken: 'refresh-token' }),
    },
  };

  const send = jest.fn<
    (arg: { requestBody: { raw: string } }) => Promise<{ data: { id: string } }>
  >(() => Promise.resolve({ data: { id: 'gmail-msg-1' } }));
  const auth = {
    getGmailClient: jest.fn(() => ({
      users: { messages: { send } },
    })),
  };

  const service = new BookingForwardService(
    prisma as unknown as PrismaService,
    config,
    auth as unknown as GmailAuthService,
  );

  return { service, prisma, auth, send };
}

/** Raw MIME (base64url) of the i-th send() call, without relying on any. */
function rawMime(call: unknown[]): string {
  return (call[0] as { requestBody: { raw: string } }).requestBody.raw;
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    bookingRef: 'BR-123456',
    source: 'viator',
    action: 'CREATE',
    outcome: 'CREATED',
    mailbox: MAILBOX,
    messageId: 'msg-1',
    threadId: 'thread-1',
    rfcMessageId: '<orig-1@mail.gmail.com>',
    subject: 'New booking: Hana-T146398840',
    from: 'Viator <no-reply@expmessaging.tripadvisor.com>',
    date: 'Thu, 22 Oct 2026 10:00:00 +0000',
    body: 'Lead traveler: Nhu\nProduct option: Hana Tour',
    ...overrides,
  };
}

/** Decode the base64 MIME parts of the message we built. */
function decodedParts(raw: string): string {
  const mime = Buffer.from(raw, 'base64url').toString('utf-8');
  const bodies = [
    ...mime.matchAll(
      /Content-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/g,
    ),
  ].map((m) =>
    Buffer.from(m[1].replace(/\r\n/g, ''), 'base64').toString('utf-8'),
  );
  return bodies.join('\n');
}

describe('BookingForwardService', () => {
  it('forwards the mail with the booking-ref confirmation', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: MAILBOX,
    });

    const result = await service.forward(input());

    expect(result).toEqual({ sent: true });
    expect(send).toHaveBeenCalledTimes(1);

    const raw = rawMime(send.mock.calls[0]);
    const mime = Buffer.from(raw, 'base64url').toString('utf-8');

    expect(mime).toContain('To: tracked@example.com');
    // Reply in the original thread → same subject, In-Reply-To/References.
    expect(mime).toContain('Subject: Re: New booking: Hana-T146398840');
    expect(mime).toContain('In-Reply-To: <orig-1@mail.gmail.com>');
    expect(mime).toContain('References: <orig-1@mail.gmail.com>');
    expect(mime).toContain('X-Booking-Sync: 1');

    const body = decodedParts(raw);
    expect(body).toContain(
      'This mail with booking ref "BR-123456" was pushed to the Booking table successfully.',
    );
    expect(body).toContain('Source: viator');
    expect(body).toContain('Action: CREATE -> CREATED');
    expect(body).toContain('Subject: New booking: Hana-T146398840');
    expect(body).toContain('Product option: Hana Tour');
  });

  it('threads amendments and cancellations and reports the outcome', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: MAILBOX,
    });

    await service.forward(input({ outcome: 'UPDATED', action: 'MODIFY' }));
    await service.forward(input({ outcome: 'CANCELLED', action: 'CANCEL' }));

    for (const call of send.mock.calls) {
      const mime = Buffer.from(rawMime(call), 'base64url').toString('utf-8');
      expect(mime).toContain('Subject: Re: New booking: Hana-T146398840');
      expect(mime).toContain('In-Reply-To: <orig-1@mail.gmail.com>');
      expect(mime).toContain('X-Booking-Sync: 1');
    }
    expect(decodedParts(rawMime(send.mock.calls[0]))).toContain(
      'Action: MODIFY -> UPDATED',
    );
    expect(decodedParts(rawMime(send.mock.calls[1]))).toContain(
      'Action: CANCEL -> CANCELLED',
    );
  });

  it('falls back to the sync subject when the original has none', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: MAILBOX,
    });

    await service.forward(input({ subject: undefined }));

    const mime = Buffer.from(rawMime(send.mock.calls[0]), 'base64url').toString(
      'utf-8',
    );
    expect(mime).toContain(
      'Subject: [Booking Sync] BR-123456 - new booking pushed to Booking table',
    );
  });

  it('does nothing when disabled', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'false',
      BOOKING_FORWARD_TO: MAILBOX,
    });

    expect(await service.forward(input())).toEqual({
      sent: false,
      reason: 'DISABLED',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('does nothing when no recipient is configured', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: '',
    });

    expect(await service.forward(input())).toEqual({
      sent: false,
      reason: 'NO_RECIPIENT',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('does nothing when the mailbox is not tracked', async () => {
    const { service, prisma, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: MAILBOX,
    });
    prisma.gmailAccount.findUnique.mockResolvedValueOnce(null);

    expect(await service.forward(input())).toEqual({
      sent: false,
      reason: 'MAILBOX_NOT_TRACKED',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('never forwards its own system notice', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: MAILBOX,
    });

    expect(
      await service.forward(
        input({ subject: '[Booking Sync] BR-123456 - new booking' }),
      ),
    ).toEqual({ sent: false, reason: 'SYSTEM_NOTICE' });
    expect(send).not.toHaveBeenCalled();
  });

  it('reports a send failure instead of throwing', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: MAILBOX,
    });
    send.mockRejectedValueOnce(
      Object.assign(
        new Error('Request had insufficient authentication scopes'),
        {
          code: 403,
        },
      ),
    );

    await expect(service.forward(input())).resolves.toEqual({
      sent: false,
      reason: 'SEND_FAILED',
    });
  });

  it('strips CR/LF from the booking ref to block header injection', async () => {
    const { service, send } = makeService({
      BOOKING_FORWARD_ENABLED: 'true',
      BOOKING_FORWARD_TO: MAILBOX,
    });

    await service.forward(
      input({
        bookingRef: 'BR-1\r\nBcc: evil@example.com',
        subject: undefined,
      }),
    );

    const mime = Buffer.from(rawMime(send.mock.calls[0]), 'base64url').toString(
      'utf-8',
    );
    expect(mime).not.toMatch(/^Bcc:/m);
    expect(mime).toContain(
      'Subject: [Booking Sync] BR-1 Bcc: evil@example.com',
    );
  });
});
