import { isResponseEmail, isSentMailOnly } from './response-mail.util';

describe('isResponseEmail', () => {
  it('detects reply subjects', () => {
    expect(isResponseEmail({ subject: 'Re: New booking' })).toBe(true);
    expect(isResponseEmail({ subject: 'RE: Booking confirmed' })).toBe(true);
    expect(isResponseEmail({ subject: 'Aw: New booking' })).toBe(true);
    expect(isResponseEmail({ subject: 'Res: New reservation' })).toBe(true);
  });

  it('detects threaded replies', () => {
    expect(
      isResponseEmail({
        subject: 'Booking update',
        inReplyTo: '<abc@example.com>',
      }),
    ).toBe(true);
  });

  it('detects auto-reply headers', () => {
    expect(
      isResponseEmail({
        subject: 'Out of office',
        autoSubmitted: 'auto-replied',
      }),
    ).toBe(true);
    expect(isResponseEmail({ subject: 'Thanks', xAutoreply: 'yes' })).toBe(
      true,
    );
    expect(
      isResponseEmail({ subject: 'Thanks', xAutorespond: 'yes' }),
    ).toBe(true);
  });

  it('keeps original booking notifications', () => {
    expect(isResponseEmail({ subject: 'New booking: 3 Nov' })).toBe(false);
    expect(
      isResponseEmail({
        subject: 'Fwd: New booking: 3 Nov',
        autoSubmitted: 'auto-generated',
      }),
    ).toBe(false);
    expect(isResponseEmail({ subject: 'Regarding your booking' })).toBe(false);
  });
});

describe('isSentMailOnly', () => {
  it('ignores mail that only exists in Sent', () => {
    expect(isSentMailOnly({ labelIds: ['SENT'] })).toBe(true);
  });

  it('keeps incoming and self-forwarded mail', () => {
    expect(isSentMailOnly({ labelIds: ['INBOX'] })).toBe(false);
    expect(isSentMailOnly({ labelIds: ['SENT', 'INBOX'] })).toBe(false);
    expect(isSentMailOnly({})).toBe(false);
  });
});
