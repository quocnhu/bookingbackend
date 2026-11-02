import { TourType } from '@prisma/client';
import { AirportTransferParser } from './airport-transfer.parser';

const MAIL = {
  messageId: 'm-airport-1',
  emailAddress: 'nquocnhu95it@gmail.com',
  subject: 'Conversation with Angela P about Viator booking BR-1461083011',
  from: 'Viator <NOT-1461083011@expmessaging.tripadvisor.com>',
  date: 'Mon, 2 Nov 2026 09:15:00 +0700',
  body: `##^- Please type your reply above this line -^##

Booking Reference: BR-1461083011

Angela P wrote:

Greetings,

Pick up in the lobby is 8am.

Kind Regards
Angela Payne

View conversation in Management Center

Booking details
Product name: Private Airport Transfer Service Ho Chi Minh City
Product Option: Transfer to Airport
Lead Traveler: Angela Payne
Phone number: +61 427 952 519
Booking Reference: BR-1461083011
Travel date/Pax: Mon Nov 16, 2026 - 2 Adults
© 2024 Viator, Inc. All rights reserved.`,
};

describe('AirportTransferParser', () => {
  const parser = new AirportTransferParser();

  it('is tagged airportTransfer', () => {
    expect(parser.templateTag).toBe('airportTransfer');
  });

  it('claims airport transfer conversation mails', () => {
    expect(parser.canParse(MAIL)).toBe(true);
  });

  it('does not claim a non-airport conversation mail', () => {
    expect(
      parser.canParse({
        ...MAIL,
        body: MAIL.body
          .replace(
            'Private Airport Transfer Service Ho Chi Minh City',
            'Cu Chi Ben Duoc Tunnels',
          )
          .replace('Transfer to Airport', 'Shared Group Morning Trip 07:30'),
      }),
    ).toBe(false);
  });

  it('extracts the booking fields', () => {
    const fields = parser.extract(MAIL)!;
    expect(fields).not.toBeNull();

    expect(fields.action).toBe('CREATE');
    expect(fields.bookingRef).toBe('BR-1461083011');
    expect(fields.source).toBe('viator');
    expect(fields.customerName).toBe('Angela Payne');
    expect(fields.phone).toBe('+61 427 952 519');
    expect(fields.tourName).toBe(
      'Private Airport Transfer Service Ho Chi Minh City',
    );
    expect(fields.totalPax).toBe(2);
    expect(fields.paxDetail).toBe('2 Adults');
    // "Pick up in the lobby is 8am" → 16 Nov 2026, 08:00 Vietnam time.
    expect(fields.startingDate).toBe('2026-11-16T01:00:00.000Z');
  });

  it('always books an airport transfer as a private tour', () => {
    const fields = parser.extract({
      ...MAIL,
      body: MAIL.body.replace(
        'Product name: Private Airport Transfer Service Ho Chi Minh City',
        'Product name: Airport Transfer Service Ho Chi Minh City',
      ),
    })!;
    expect(fields.tourType).toBe(TourType.PRIVATE_TOUR);
    expect(fields.extra).toMatchObject({
      template: 'airportTransfer',
      airportTransfer: true,
    });
  });
});
