import { renderPickupReminder } from './pickup-reminder.template';

describe('renderPickupReminder', () => {
  const base = {
    bookingRef: 'GR-TEST-1',
    customerName: '<b>Alex</b>',
    tourName: 'Mekong <Delta>',
    startingDate: '2026-12-02T01:00:00.000Z',
    pickupTime: '08:00',
    hotelName: 'Hotel & Spa',
    address: '123 Street',
    totalPax: 2,
    paxDetail: '2 adults',
    guide: { name: 'Guide Mai', email: 'mai@example.com' },
    durationDays: 1,
    company: { name: 'Hana Tourist', phone: '0123' },
  };

  it('renders the tour, pickup and guide details', () => {
    const mail = renderPickupReminder(base);
    expect(mail.subject).toContain('Pickup reminder');
    expect(mail.subject).toContain('08:00');
    expect(mail.text).toContain('Mekong <Delta>');
    expect(mail.text).toContain('08:00');
    expect(mail.text).toContain('Hotel & Spa');
    expect(mail.text).toContain('Guide Mai');
    expect(mail.text).toContain('mai@example.com');
    expect(mail.text).toContain('GR-TEST-1');
    expect(mail.html).toContain('Guide');
  });

  it('escapes user-provided HTML', () => {
    const mail = renderPickupReminder(base);
    expect(mail.html).not.toContain('<b>Alex</b>');
    expect(mail.html).not.toContain('Mekong <Delta>');
    expect(mail.html).toContain('&lt;b&gt;Alex&lt;/b&gt;');
    expect(mail.html).toContain('Mekong &lt;Delta&gt;');
    expect(mail.html).toContain('Hotel &amp; Spa');
  });

  it('falls back to the driver when there is no guide', () => {
    const mail = renderPickupReminder({
      ...base,
      pickupTime: null,
      guide: null,
      driver: { name: 'Driver Nam', email: 'nam@example.com' },
    });
    expect(mail.text).toContain('To be confirmed');
    expect(mail.text).toContain('Driver Nam');
    expect(mail.html).toContain('To be confirmed');
  });
});
