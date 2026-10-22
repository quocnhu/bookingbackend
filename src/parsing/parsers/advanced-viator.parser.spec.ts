import { BookingProvider, TourType } from '@prisma/client';
import { AdvancedViatorParser } from './advanced-viator.parser';

/** A real Viator "Conversation with …" mail (Tripadvisor expmessaging). */
const MAIL = {
  messageId: 'm-1',
  emailAddress: 'nquocnhu95it@gmail.com',
  subject: 'Conversation with Pablo M about Viator booking BR-1457720525',
  from: 'Viator <NOT-48586e7a-6d5c-4a30-a2f1-c3b1e5b0a111@expmessaging.tripadvisor.com>',
  date: 'Mon, 19 Oct 2026 06:46:00 +0700',
  body: `##^- Please type your reply above this line -^##

Booking Reference: BR-1457720525

Pablo M wrote:

Hi James,

This is Pablo Madrigal (2 adults, with my wife Paloma). Booking 1787449424
/ ref 1457720525, Cu Chi Ben Duoc tour today, October 19, 7:30 AM.

My WhatsApp number is +506 7105 9897. Please message us there so the guide
can confirm the pickup time.

Pickup point: Emerald Apartments, 107/11 Truong Dinh, Ward 6, District 3.
We will wait in the lobby.

Thank you,
Pablo

View conversation in Management Center

Booking details
Product name: Cu Chi Ben Duoc Tunnels: Authentic & Less Touristy (Max 10)
Product Option: Shared Group Morning/Noon Trip 07:30
Lead Traveler: Pablo Madrigal
Phone number: +66 2 030 4763
Booking Reference: BR-1457720525
Travel date/Pax: Mon Oct 19, 2026 - 2 Adults
© 2024 Viator, Inc. All rights reserved.`,
};

describe('AdvancedViatorParser', () => {
  const parser = new AdvancedViatorParser();

  it('is tagged advancedViator', () => {
    expect(parser.templateTag).toBe('advancedViator');
  });

  it('claims the conversation mails', () => {
    expect(parser.canParse(MAIL)).toBe(true);
  });

  it('does not claim the standard Viator confirmation', () => {
    expect(
      parser.canParse({
        subject: 'Your booking is confirmed',
        from: 'nquocnhu95book@gmail.com',
        body: 'Booking Ref: BR-123\nProduct: Cu Chi Ben Duoc\nCustomer: Pablo',
      }),
    ).toBe(false);
  });

  it('extracts the booking fields', () => {
    const fields = parser.extract(MAIL)!;
    expect(fields).not.toBeNull();

    expect(fields.action).toBe('CREATE');
    expect(fields.bookingRef).toBe('BR-1457720525');
    // Same source as the standard Viator template → the upsert key
    // (source, bookingRef) points at the same booking.
    expect(fields.source).toBe('viator');
    expect(fields.channel).toBe(BookingProvider.VIATOR);
    expect(fields.customerName).toBe('Pablo Madrigal');
    expect(fields.phone).toBe('+66 2 030 4763');
    expect(fields.tourName).toBe(
      'Cu Chi Ben Duoc Tunnels: Authentic & Less Touristy (Max 10)',
    );
    expect(fields.tourType).toBe(TourType.GROUP_TOUR);
    expect(fields.totalPax).toBe(2);
    expect(fields.paxDetail).toBe('2 Adults');
    expect(fields.hotelName).toBe('Emerald Apartments');
    expect(fields.address).toBe('107/11 Truong Dinh, Ward 6, District 3');
    // 19 Oct 2026, 07:30 Vietnam time
    expect(fields.startingDate).toBe('2026-10-19T00:30:00.000Z');
  });

  it('uses the conversation thread address as mail (no customer email)', () => {
    const fields = parser.extract(MAIL)!;
    expect(fields.mail).toBe(
      'NOT-48586e7a-6d5c-4a30-a2f1-c3b1e5b0a111@expmessaging.tripadvisor.com',
    );
  });

  it('keeps the customer message and the extra data in extra', () => {
    const fields = parser.extract(MAIL)!;
    expect(fields.extra).toMatchObject({
      template: 'advancedViator',
      productOption: 'Shared Group Morning/Noon Trip 07:30',
      whatsapp: '+506 7105 9897',
      viatorBookingId: '1787449424',
      viatorRef: '1457720525',
      pickupPoint: 'Emerald Apartments, 107/11 Truong Dinh, Ward 6, District 3',
    });
    expect(String(fields.extra?.customerMessage)).toContain(
      'My WhatsApp number is +506 7105 9897',
    );
  });

  it('returns null without a booking reference', () => {
    expect(
      parser.extract({
        subject: 'Conversation with Pablo M',
        from: MAIL.from,
        body: 'Hi, I have a question about my tour.',
      }),
    ).toBeNull();
  });

  it('flags the thread relay address as the mail source', () => {
    const fields = parser.extract(MAIL)!;
    expect(fields.extra).toMatchObject({ mailSource: 'thread-relay' });
  });
});

/** An automated cancellation sent by the Viator message centre. */
const CANCEL_MAIL = {
  messageId: 'm-2',
  emailAddress: 'nquocnhu95it@gmail.com',
  subject: 'Your Viator booking BR-1457720525 has been cancelled',
  from: 'Viator <NOT-48586e7a-f4f1-4bff-a0a4-9c4aa776286d@expmessaging.tripadvisor.com>',
  date: 'Mon, 19 Oct 2026 07:12:00 +0700',
  body: `##^- Please type your reply above this line -^##

Booking Reference: BR-1457720525

Your booking has been cancelled and the refund has been issued.

View conversation in Management Center

Booking details
Product name: Cu Chi Ben Duoc Tunnels: Authentic & Less Touristy (Max 10)
Product Option: Shared Group Morning/Noon Trip 07:30
Lead Traveler: Pablo Madrigal
Phone number: +66 2 030 4763
Booking Reference: BR-1457720525
Travel date/Pax: Mon Oct 19, 2026 - 2 Adults
© 2024 Viator, Inc. All rights reserved.`,
};

/** An amendment of the tour date sent by the Viator message centre. */
const AMEND_MAIL = {
  messageId: 'm-3',
  emailAddress: 'nquocnhu95it@gmail.com',
  subject: 'Your Viator booking BR-1457720525 has been updated',
  from: 'Viator <NOT-48586e7a-f4f1-4bff-a0a4-9c4aa776286d@expmessaging.tripadvisor.com>',
  date: 'Mon, 19 Oct 2026 07:12:00 +0700',
  body: `##^- Please type your reply above this line -^##

Booking Reference: BR-1457720525

Your booking has been updated to the morning departure.

Booking details
Product name: Cu Chi Ben Duoc Tunnels: Authentic & Less Touristy (Max 10)
Product Option: Shared Group Morning/Noon Trip 07:30
Lead Traveler: Pablo Madrigal
Phone number: +66 2 030 4763
Booking Reference: BR-1457720525
Travel date/Pax: Mon Oct 19, 2026 - 2 Adults
© 2024 Viator, Inc. All rights reserved.`,
};

describe('AdvancedViatorParser — cancellation / amendment', () => {
  const parser = new AdvancedViatorParser();

  it('claims the cancellation of the message centre', () => {
    expect(parser.canParse(CANCEL_MAIL)).toBe(true);
  });

  it('claims a cancellation that has no "Booking details" block', () => {
    expect(
      parser.canParse({
        subject: 'Your Viator booking BR-1457720525 has been cancelled',
        from: CANCEL_MAIL.from,
        body: 'Booking Reference: BR-1457720525\nYour booking has been cancelled.',
      }),
    ).toBe(true);
  });

  it('claims a cancellation forwarded by a sender routed to this template', () => {
    const previous = process.env.MAIL_TEMPLATE_PREFIX_RULES;
    process.env.MAIL_TEMPLATE_PREFIX_RULES =
      'from:nquocnhu95tourguide@gmail.com=advancedViator';
    try {
      const mail = {
        subject: 'Your Viator booking BR-1457720525 has been cancelled',
        from: 'nquocnhu95tourguide@gmail.com',
        body: 'Booking Reference: BR-1457720525\nYour booking has been cancelled.',
      };
      expect(parser.canParse(mail)).toBe(true);
      expect(parser.extract(mail)!.action).toBe('CANCEL');
    } finally {
      if (previous === undefined) delete process.env.MAIL_TEMPLATE_PREFIX_RULES;
      else process.env.MAIL_TEMPLATE_PREFIX_RULES = previous;
    }
  });

  it('detects the cancellation', () => {
    const fields = parser.extract(CANCEL_MAIL)!;
    expect(fields.action).toBe('CANCEL');
    expect(fields.bookingRef).toBe('BR-1457720525');
    expect(fields.source).toBe('viator');
  });

  it('detects the amendment', () => {
    const fields = parser.extract(AMEND_MAIL)!;
    expect(fields.action).toBe('MODIFY');
    expect(fields.bookingRef).toBe('BR-1457720525');
  });

  it('does not downgrade the customer name on a cancellation', () => {
    // The subject salutation is a short form ("Pablo M") — it must not
    // replace the full name stored on the booking.
    const fields = parser.extract({
      subject: 'Conversation with Pablo M about Viator booking BR-1457720525',
      from: CANCEL_MAIL.from,
      body: 'Booking Reference: BR-1457720525\nYour booking has been cancelled.',
    })!;
    expect(fields.action).toBe('CANCEL');
    expect(fields.customerName).toBeUndefined();
  });

  it('does not claim a cancellation coming from another sender', () => {
    expect(
      parser.canParse({
        subject: 'Your booking BR-1457720525 has been cancelled',
        from: 'someone@example.com',
        body: 'Booking Reference: BR-1457720525\nYour booking has been cancelled.',
      }),
    ).toBe(false);
  });
});
