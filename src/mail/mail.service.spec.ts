import * as net from 'node:net';
import { BookingProvider } from '@prisma/client';
import { MailService } from './mail.service';

type CapturedMessage = { from: string; to: string[]; data: string };

function startFakeSmtp(): Promise<{
  port: number;
  messages: CapturedMessage[];
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const messages: CapturedMessage[] = [];
    const server = net.createServer((socket) => {
      let buffer = '';
      let inData = false;
      let current: CapturedMessage = { from: '', to: [], data: '' };
      socket.write('220 fake-smtp ESMTP\r\n');
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        let index = buffer.indexOf('\r\n');
        while (index >= 0) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (inData) {
            if (line === '.') {
              inData = false;
              messages.push(current);
              current = { from: '', to: [], data: '' };
              socket.write('250 OK queued\r\n');
            } else {
              current.data += `${line}\n`;
            }
          } else if (/^EHLO|^HELO/i.test(line)) {
            socket.write(
              '250-fake-smtp\r\n250-SIZE 10485760\r\n250 8BITMIME\r\n',
            );
          } else if (/^MAIL FROM:/i.test(line)) {
            current.from = line;
            socket.write('250 OK\r\n');
          } else if (/^RCPT TO:/i.test(line)) {
            current.to.push(line);
            socket.write('250 OK\r\n');
          } else if (/^DATA/i.test(line)) {
            inData = true;
            socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
          } else if (/^QUIT/i.test(line)) {
            socket.write('221 Bye\r\n');
            socket.end();
          } else {
            socket.write('250 OK\r\n');
          }
          index = buffer.indexOf('\r\n');
        }
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        port,
        messages,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe('MailService booking confirmation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('TEMPLATE_MAIL_')) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('sends exactly one confirmation with the rendered template', async () => {
    const smtp = await startFakeSmtp();
    process.env.TEMPLATE_MAIL_ENABLED = 'true';
    process.env.TEMPLATE_MAIL_HOST = '127.0.0.1';
    process.env.TEMPLATE_MAIL_PORT = String(smtp.port);
    process.env.TEMPLATE_MAIL_SECURE = 'false';
    process.env.TEMPLATE_MAIL_REQUIRE_TLS = 'false';
    process.env.TEMPLATE_MAIL_USER = '';
    process.env.TEMPLATE_MAIL_PASSWORD = '';
    process.env.TEMPLATE_MAIL_FROM = 'bookings@example.com';
    process.env.TEMPLATE_MAIL_FROM_NAME = 'Hana Tourist';

    let claimedAt: Date | null = null;
    const booking = {
      id: 'booking-1',
      bookingRef: 'MB-TEST-1',
      channel: BookingProvider.WEBSITE,
      customerName: 'Test Tourist',
      mail: 'tourist@example.com',
      phone: '+84900000000',
      startingDate: new Date('2026-12-01T01:00:00.000Z'),
      departureTime: '08:00',
      totalPax: 2,
      paxDetail: '2 adults',
      totalAmount: { toString: () => '5382000' },
      currency: 'VND',
      payment: 'PAID',
      paymentMethod: 'PAYPAL',
      payLater: false,
      hotelName: 'Test Hotel',
      address: '123 Street',
      notes: null,
      tourName: null,
      tour: { name: 'Test Tour', durationDays: 1 },
      get confirmationEmailSentAt() {
        return claimedAt;
      },
    };
    const prisma = {
      booking: {
        findUnique: async () => ({ ...booking }),
        updateMany: async (args: any) => {
          if (args.where.confirmationEmailSentAt === null) {
            if (claimedAt) return { count: 0 };
          } else if (
            args.data.confirmationEmailSentAt === null &&
            args.where.confirmationEmailSentAt instanceof Date
          ) {
            if (
              !claimedAt ||
              claimedAt.getTime() !==
                args.where.confirmationEmailSentAt.getTime()
            ) {
              return { count: 0 };
            }
            claimedAt = null;
            return { count: 1 };
          }
          claimedAt = args.data.confirmationEmailSentAt;
          return { count: 1 };
        },
      },
      companyProfile: {
        findFirst: async () => ({
          name: 'Hana Tourist',
          phone: '0123 456 789',
          email: 'hello@example.com',
          website: 'https://example.com',
          address: 'Ho Chi Minh City',
        }),
      },
    };

    const mail = new MailService(prisma as any);
    const first = await mail.sendBookingConfirmation('booking-1');
    expect(first).toEqual({ sent: true });
    expect(smtp.messages).toHaveLength(1);
    const sent = smtp.messages[0];
    expect(sent.to.join(' ')).toContain('tourist@example.com');
    expect(sent.data).toContain('Subject:');
    expect(sent.data).toContain('MB-TEST-1');
    expect(sent.data).toContain('Test Tour');
    expect(sent.data).toContain('5,382,000');

    const second = await mail.sendBookingConfirmation('booking-1');
    expect(second).toEqual({ sent: false, reason: 'ALREADY_SENT' });
    expect(smtp.messages).toHaveLength(1);

    await smtp.close();
  });

  it('stays disabled (and never throws) when TEMPLATE_MAIL_ENABLED is false', async () => {
    process.env.TEMPLATE_MAIL_ENABLED = 'false';
    const mail = new MailService({} as any);
    await expect(mail.sendBookingConfirmation('booking-1')).resolves.toEqual({
      sent: false,
      reason: 'DISABLED',
    });
  });
});
