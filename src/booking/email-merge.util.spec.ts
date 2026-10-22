import { BookingProvider, BookingStatus } from '@prisma/client';
import {
  buildEmailUpdateData,
  EmailFields,
  hasBookingChanges,
} from './email-merge.util';

const existing = {
  status: BookingStatus.ASSIGNED,
  extra: { supplier: 'Viator', rate: 'net' },
};

const parsed = (over: Partial<EmailFields> = {}): EmailFields => ({
  bookingRef: 'ABC123',
  source: 'viator',
  channel: 'VIATOR',
  ...over,
});

describe('buildEmailUpdateData', () => {
  it('writes only the fields the email carried', () => {
    const data = buildEmailUpdateData(
      parsed({ startingDate: new Date('2026-11-25T02:00:00.000Z') }),
      existing,
      'MODIFY',
    );

    expect(data.startingDate).toEqual(new Date('2026-11-25T02:00:00.000Z'));
    // The fields the amendment email did NOT carry must not be blanked.
    expect(data).not.toHaveProperty('hotelName');
    expect(data).not.toHaveProperty('phone');
    expect(data).not.toHaveProperty('totalPax');
  });

  it('keeps the lifecycle status on an amendment', () => {
    const data = buildEmailUpdateData(
      parsed({ address: 'Hotel Saigon - Lobby' }),
      existing,
      'MODIFY',
    );
    expect(data.status).toBe(BookingStatus.ASSIGNED);
  });

  it('cancels the booking on a CANCEL action', () => {
    const data = buildEmailUpdateData(parsed(), existing, 'CANCEL');
    expect(data.status).toBe(BookingStatus.CANCELED);
  });

  it('never changes the identity', () => {
    const data = buildEmailUpdateData(
      parsed({ bookingRef: 'NEW-REF', source: 'other' }),
      existing,
      'MODIFY',
    );
    expect(data).not.toHaveProperty('bookingRef');
    expect(data).not.toHaveProperty('source');
  });

  it('merges extra instead of replacing it', () => {
    const data = buildEmailUpdateData(
      parsed({ extra: { amendment: 'new date' } }),
      existing,
      'MODIFY',
    );
    expect(data.extra).toEqual({
      supplier: 'Viator',
      rate: 'net',
      amendment: 'new date',
    });
  });

  it('drops extra when neither side has any', () => {
    const data = buildEmailUpdateData(
      parsed(),
      { status: BookingStatus.PENDING },
      'MODIFY',
    );
    expect(data).not.toHaveProperty('extra');
  });

  it('keeps a false isNoShow (it is a real value, not an absent one)', () => {
    const data = buildEmailUpdateData(
      parsed({ isNoShow: false }),
      existing,
      'MODIFY',
    );
    expect(data.isNoShow).toBe(false);
  });

  it('never overwrites the customer email with the Viator thread relay', () => {
    const data = buildEmailUpdateData(
      parsed({
        mail: 'NOT-48586e7a@expmessaging.tripadvisor.com',
        extra: { mailSource: 'thread-relay' },
      }),
      { ...existing, mail: 'pablo.madrigal@gmail.com' },
      'MODIFY',
    );
    expect(data).not.toHaveProperty('mail');
  });

  it('writes the relay address when the booking has no email yet', () => {
    const data = buildEmailUpdateData(
      parsed({
        mail: 'NOT-48586e7a@expmessaging.tripadvisor.com',
        extra: { mailSource: 'thread-relay' },
      }),
      { ...existing, mail: null },
      'CREATE',
    );
    expect(data.mail).toBe('NOT-48586e7a@expmessaging.tripadvisor.com');
  });
});

describe('hasBookingChanges', () => {
  it('detects a changed field', () => {
    const data = buildEmailUpdateData(
      parsed({ startingDate: new Date('2026-11-26T02:00:00.000Z') }),
      existing,
      'MODIFY',
    );
    expect(
      hasBookingChanges(data, {
        startingDate: new Date('2026-11-25T02:00:00.000Z'),
        status: BookingStatus.ASSIGNED,
        channel: BookingProvider.VIATOR,
      }),
    ).toBe(true);
  });

  it('reports no change for a re-sent confirmation', () => {
    const data = buildEmailUpdateData(
      parsed({
        startingDate: new Date('2026-11-25T02:00:00.000Z'),
        hotelName: 'Hotel Saigon',
      }),
      existing,
      'CREATE',
    );
    expect(
      hasBookingChanges(data, {
        startingDate: new Date('2026-11-25T02:00:00.000Z'),
        hotelName: 'Hotel Saigon',
        status: BookingStatus.ASSIGNED,
        channel: BookingProvider.VIATOR,
      }),
    ).toBe(false);
  });

  it('ignores emailDate and extra — they change on every email', () => {
    const data = buildEmailUpdateData(
      parsed({ hotelName: 'Hotel Saigon' }),
      existing,
      'CREATE',
    );
    data.emailDate = new Date('2026-11-25T02:00:00.000Z');
    expect(
      hasBookingChanges(data, {
        hotelName: 'Hotel Saigon',
        status: BookingStatus.ASSIGNED,
        channel: BookingProvider.VIATOR,
        extra: { supplier: 'Viator' },
      }),
    ).toBe(false);
  });
});
