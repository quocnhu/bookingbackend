import { detectAction, emailBodyText } from './action.util';

describe('detectAction', () => {
  it('treats a plain confirmation as CREATE', () => {
    expect(detectAction('Booking confirmed - ABC123')).toBe('CREATE');
    expect(detectAction('Your reservation ABC123')).toBe('CREATE');
  });

  it('detects a cancellation from the subject', () => {
    expect(detectAction('Your booking ABC123 has been cancelled')).toBe(
      'CANCEL',
    );
    expect(detectAction('Booking cancelled - ABC123')).toBe('CANCEL');
  });

  it('detects a cancellation from the body', () => {
    expect(
      detectAction('Booking ABC123', 'Your booking has been cancelled.'),
    ).toBe('CANCEL');
  });

  it('detects an amendment from the subject', () => {
    expect(detectAction('Your booking ABC123 has been updated')).toBe('MODIFY');
    expect(detectAction('Booking update - ABC123')).toBe('MODIFY');
    expect(detectAction('Amended booking - ABC123')).toBe('MODIFY');
    expect(detectAction('Changes to your booking - ABC123')).toBe('MODIFY');
  });

  it('detects an amendment from the body', () => {
    expect(
      detectAction('Booking ABC123', 'We have updated your booking.'),
    ).toBe('MODIFY');
    expect(
      detectAction(
        'Booking ABC123',
        'Changes have been made to your booking: new date 12 Nov.',
      ),
    ).toBe('MODIFY');
  });

  it('lets CANCEL win over MODIFY', () => {
    expect(
      detectAction(
        'Booking update - ABC123',
        'Your booking has been cancelled and refunded.',
      ),
    ).toBe('CANCEL');
  });

  it('ignores policy and marketing lines', () => {
    expect(
      detectAction('Free cancellation until 24 hours before departure'),
    ).toBe('CREATE');
    expect(
      detectAction(
        'Booking confirmed',
        'Free cancellation until 24 hours before departure.',
      ),
    ).toBe('CREATE');
  });

  it('does not mistake a request to update payment details for an amendment', () => {
    expect(
      detectAction(
        'Booking confirmed',
        'Please update your payment details to complete the booking.',
      ),
    ).toBe('CREATE');
  });

  it('does not treat a promise of a future change as an amendment', () => {
    expect(
      detectAction('Booking confirmed', 'Your booking will be updated soon.'),
    ).toBe('CREATE');
  });
});

describe('emailBodyText', () => {
  it('joins the body and the snippet', () => {
    expect(emailBodyText({ body: 'Hello', snippet: 'World' })).toBe(
      'Hello\nWorld',
    );
  });

  it('ignores missing and non-string parts', () => {
    expect(emailBodyText({ body: 42, snippet: undefined })).toBe('');
    expect(emailBodyText({})).toBe('');
  });
});
