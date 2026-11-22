"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPickupReminder = renderPickupReminder;
const mail_format_util_1 = require("./mail-format.util");
function renderPickupReminder(data) {
    const tourName = (data.tourName ?? '').trim() || 'Your tour';
    const bookingRef = data.bookingRef.trim();
    const customer = (data.customerName ?? '').trim() || 'there';
    const date = (0, mail_format_util_1.formatMailDate)(data.startingDate);
    const pickupTime = (data.pickupTime ?? '').trim();
    const pickupPlace = [data.hotelName, data.address]
        .map((v) => (v ?? '').trim())
        .filter(Boolean)
        .join(', ') || '-';
    const guests = Number(data.totalPax) || 1;
    const paxDetail = (data.paxDetail ?? '').trim();
    const company = data.company ?? null;
    const companyName = (company?.name ?? '').trim() || 'Hana Tourist';
    const companySentence = (0, mail_format_util_1.asSentence)(companyName);
    const contact = data.guide ?? data.driver ?? null;
    const contactRole = data.guide ? 'Tour guide' : data.driver ? 'Driver' : null;
    const contactLine = contact
        ? [
            contact.name?.trim() || null,
            contact.phone?.trim() ? `Phone: ${contact.phone.trim()}` : null,
            contact.email?.trim() ? `Email: ${contact.email.trim()}` : null,
        ]
            .filter(Boolean)
            .join(' · ')
        : null;
    const companyContact = [
        company?.phone?.trim() ? `Phone: ${company.phone.trim()}` : null,
        company?.email?.trim() ? `Email: ${company.email.trim()}` : null,
        company?.website?.trim() ? `Website: ${company.website.trim()}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
    const subject = pickupTime
        ? `Pickup reminder — ${date} at ${pickupTime} — ${tourName}`
        : `Pickup reminder — ${date} — ${tourName}`;
    const rows = [
        ['Tour', tourName],
        ['Date', date],
        ['Pickup time', pickupTime || 'To be confirmed'],
        ['Pickup point', pickupPlace],
        ['Guests', `${guests}${paxDetail ? ` · ${paxDetail}` : ''}`],
        ['Booking reference', bookingRef],
    ];
    if (data.durationDays)
        rows.splice(2, 0, ['Duration', (0, mail_format_util_1.formatDuration)(data.durationDays)]);
    if (contactLine && contactRole)
        rows.push([contactRole, contactLine]);
    if (data.vehiclePlate?.trim())
        rows.push(['Vehicle', data.vehiclePlate.trim()]);
    const text = [
        `Hello ${customer},`,
        '',
        `This is a friendly reminder for your upcoming tour with ${companySentence}`,
        '',
        ...rows.map(([label, value]) => `${label}: ${value}`),
        '',
        'Please be ready at your pickup point at least 10 minutes before the pickup time.',
        'Keep your phone reachable in case the guide needs to contact you.',
        contact?.email?.trim()
            ? `If your plans change, contact your ${contactRole?.toLowerCase() ?? 'guide'} at ${contact.email.trim()}.`
            : 'If your plans change, reply to this email as soon as possible.',
        '',
        companyName,
        company?.address?.trim() || null,
        companyContact || null,
    ]
        .filter((line) => line !== null)
        .join('\n');
    const row = (label, value) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1e5d2;color:#7a6a55;font-size:13px;width:38%">${(0, mail_format_util_1.escapeHtml)(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1e5d2;color:#2b1d0e;font-size:13px;font-weight:600;text-align:right">${(0, mail_format_util_1.escapeHtml)(value)}</td>
    </tr>`;
    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f3ed;font-family:Arial,Helvetica,sans-serif;color:#2b1d0e">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ed;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(43,29,14,0.08)">
            <tr>
              <td style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:24px 28px">
                <div style="font-size:22px;font-weight:700;color:#3b1d03;letter-spacing:0.4px">${(0, mail_format_util_1.escapeHtml)(companyName)}</div>
                <div style="margin-top:6px;font-size:14px;color:#3b1d03;opacity:0.9">Pickup reminder</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 6px">
                <p style="margin:0 0 8px;font-size:16px">Hello ${(0, mail_format_util_1.escapeHtml)(customer)},</p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6b5a45">
                  This is a friendly reminder for your upcoming tour with ${(0, mail_format_util_1.escapeHtml)(companySentence)}
                </p>
                ${pickupTime
        ? `<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:14px 16px;margin-bottom:16px">
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#9a3412;font-weight:700">Pickup time</div>
                        <div style="font-size:24px;font-weight:800;color:#7c2d12;margin-top:2px">${(0, mail_format_util_1.escapeHtml)(pickupTime)}</div>
                        <div style="font-size:13px;color:#9a3412;margin-top:2px">${(0, mail_format_util_1.escapeHtml)(pickupPlace)}</div>
                      </div>`
        : ''}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #f1e5d2;border-radius:10px;overflow:hidden">
                  ${rows.map(([label, value]) => row(label, value)).join('')}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 6px">
                <div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:12px 14px;font-size:13px;line-height:1.6;color:#6b5a45">
                  Please be ready at your pickup point at least <strong style="color:#2b1d0e">10 minutes before</strong> the pickup time.
                  Keep your phone reachable in case the guide needs to contact you.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 24px;border-top:1px solid #f1e5d2;font-size:12px;color:#8a7a66;line-height:1.7">
                ${contact?.email?.trim()
        ? `If your plans change, contact your ${(0, mail_format_util_1.escapeHtml)(contactRole?.toLowerCase() ?? 'guide')} at ${(0, mail_format_util_1.escapeHtml)(contact.email.trim())}.<br/>`
        : 'If your plans change, reply to this email as soon as possible.<br/>'}
                <strong style="color:#2b1d0e;font-size:13px">${(0, mail_format_util_1.escapeHtml)(companyName)}</strong><br/>
                ${company?.address?.trim() ? `${(0, mail_format_util_1.escapeHtml)(company.address.trim())}<br/>` : ''}
                ${companyContact ? (0, mail_format_util_1.escapeHtml)(companyContact) : ''}
              </td>
            </tr>
          </table>
          <div style="max-width:620px;margin-top:12px;font-size:11px;color:#9a8a76;text-align:center">
            Booking ${(0, mail_format_util_1.escapeHtml)(bookingRef)} · This reminder was sent before your pickup.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
    return { subject, text, html };
}
//# sourceMappingURL=pickup-reminder.template.js.map