import { renderBookingConfirmation } from './booking-confirmation.template';

const base = {
  bookingRef: 'MB-1234',
  customerName: '<script>alert(1)</script>',
  startingDate: '2026-11-22T01:00:00.000Z',
  departureTime: '08:00',
  totalPax: 2,
  paxDetail: '2 adults',
  totalAmount: '5382000',
  currency: 'VND',
  paymentStatus: 'PAID',
  paymentMethod: 'PAYPAL',
  hotelName: 'Hotel <A>',
  address: '123 Street & Lane',
  tourName: 'Mekong <Delta>',
  durationDays: 1,
};

describe('renderBookingConfirmation', () => {
  it('renders the booking details in the subject, text and HTML', () => {
    const mail = renderBookingConfirmation(base, {
      name: 'Hana Tourist',
      phone: '0123',
      email: 'hello@example.com',
    });
    expect(mail.subject).toContain('MB-1234');
    expect(mail.text).toContain('Mekong <Delta>');
    expect(mail.text).toContain('5,382,000 ₫');
    expect(mail.text).toContain('08:00');
    expect(mail.html).toContain('5,382,000 ₫');
    expect(mail.html).toContain('Booking reference');
  });

  it('escapes user-provided HTML so the mail cannot inject markup', () => {
    const mail = renderBookingConfirmation(base);
    expect(mail.html).not.toContain('<script>alert(1)</script>');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mail.html).toContain('Hotel &lt;A&gt;');
    expect(mail.html).toContain('Mekong &lt;Delta&gt;');
    expect(mail.html).toContain('123 Street &amp; Lane');
  });

  it('marks a pay-later booking as due at the end of the tour', () => {
    const mail = renderBookingConfirmation({
      ...base,
      paymentStatus: 'PENDING',
      paymentMethod: null,
      payLater: true,
    });
    expect(mail.text).toContain('Pay later');
    expect(mail.html).toContain('Pay later');
  });
});
