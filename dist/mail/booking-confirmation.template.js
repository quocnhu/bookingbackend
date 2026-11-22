"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderBookingConfirmation = renderBookingConfirmation;
const mail_format_util_1 = require("./mail-format.util");
function paymentLabel(data) {
    const status = String(data.paymentStatus ?? '').toUpperCase();
    if (status === 'PAID')
        return 'Paid';
    if (data.payLater)
        return 'Pay later — due at the end of the tour';
    if (status === 'PENDING')
        return 'Pending payment';
    return status ? status.replace(/_/g, ' ').toLowerCase() : '-';
}
function renderBookingConfirmation(data, company) {
    const tourName = (data.tourName ?? '').trim() || 'Your tour';
    const bookingRef = data.bookingRef.trim();
    const customers = Number(data.totalPax) || 1;
    const total = (0, mail_format_util_1.formatMoney)(data.totalAmount, data.currency);
    const date = (0, mail_format_util_1.formatMailDate)(data.startingDate);
    const departure = (data.departureTime ?? '').trim();
    const payment = paymentLabel(data);
    const companyName = (company?.name ?? '').trim() || 'Hana Tourist';
    const companyNameSentence = (0, mail_format_util_1.asSentence)(companyName);
    const contactLine = [
        company?.phone ? `Phone: ${company.phone}` : null,
        company?.email ? `Email: ${company.email}` : null,
        company?.website ? `Website: ${company.website}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
    const subject = `Booking ${bookingRef} confirmed — ${tourName}`;
    const text = [
        `Hello ${data.customerName?.trim() || 'there'},`,
        '',
        `Thank you for booking with ${companyNameSentence} Your reservation is confirmed.`,
        '',
        `Booking reference: ${bookingRef}`,
        `Tour: ${tourName}`,
        `Date: ${date}${departure ? ` at ${departure}` : ''}`,
        `Duration: ${(0, mail_format_util_1.formatDuration)(data.durationDays)}`,
        `Guests: ${customers}${data.paxDetail?.trim() ? ` (${data.paxDetail.trim()})` : ''}`,
        `Pickup: ${[data.hotelName, data.address].filter((v) => (v ?? '').trim()).join(', ') || '-'}`,
        `Total: ${total}`,
        `Payment: ${payment}${data.paymentMethod ? ` (${String(data.paymentMethod).replace(/_/g, ' ').toLowerCase()})` : ''}`,
        '',
        data.notes?.trim() ? `Your note: ${data.notes.trim()}` : null,
        data.notes?.trim() ? '' : null,
        'Please keep this email for your records. Reply to this message if you need any help.',
        '',
        companyName,
        company?.address?.trim() || null,
        contactLine || null,
    ]
        .filter((line) => line !== null)
        .join('\n');
    const row = (label, value) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eef3;color:#5b6b7a;font-size:13px;width:38%">${(0, mail_format_util_1.escapeHtml)(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8eef3;color:#0f2740;font-size:13px;font-weight:600;text-align:right">${(0, mail_format_util_1.escapeHtml)(value)}</td>
    </tr>`;
    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef4f8;font-family:Arial,Helvetica,sans-serif;color:#0f2740">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f8;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,39,64,0.08)">
            <tr>
              <td style="background:linear-gradient(135deg,#22D3EE,#3B82F6);padding:26px 28px">
                <div style="font-size:22px;font-weight:700;color:#062A30;letter-spacing:0.4px">${(0, mail_format_util_1.escapeHtml)(companyName)}</div>
                <div style="margin-top:6px;font-size:14px;color:#062A30;opacity:0.85">Booking confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px">
                <p style="margin:0 0 10px;font-size:16px">Hello ${(0, mail_format_util_1.escapeHtml)(data.customerName?.trim() || 'there')},</p>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#40566b">
                  Thank you for booking with ${(0, mail_format_util_1.escapeHtml)(companyNameSentence)}
                  Your reservation is confirmed. Here are your booking details.
                </p>
                <div style="display:inline-block;background:#ecfeff;border:1px solid #67e8f9;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:700;color:#0c4a6e">
                  Booking reference: ${(0, mail_format_util_1.escapeHtml)(bookingRef)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 4px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e8eef3;border-radius:10px;overflow:hidden">
                  ${row('Tour', tourName)}
                  ${row('Date', `${date}${departure ? ` · ${departure}` : ''}`)}
                  ${row('Duration', (0, mail_format_util_1.formatDuration)(data.durationDays))}
                  ${row('Guests', `${customers}${data.paxDetail?.trim() ? ` · ${data.paxDetail.trim()}` : ''}`)}
                  ${row('Pickup', [data.hotelName, data.address].filter((v) => (v ?? '').trim()).join(', ') || '-')}
                  ${row('Total', total)}
                  ${row('Payment', `${payment}${data.paymentMethod ? ` · ${String(data.paymentMethod).replace(/_/g, ' ').toLowerCase()}` : ''}`)}
                </table>
              </td>
            </tr>
            ${data.notes?.trim()
        ? `<tr><td style="padding:14px 28px 0">
                    <div style="background:#f8fafc;border-left:4px solid #22D3EE;padding:12px 14px;font-size:13px;line-height:1.6;color:#40566b">
                      <strong style="color:#0f2740">Your note:</strong> ${(0, mail_format_util_1.escapeHtml)(data.notes.trim())}
                    </div>
                  </td></tr>`
        : ''}
            <tr>
              <td style="padding:22px 28px 4px">
                <p style="margin:0 0 6px;font-size:13px;color:#40566b;line-height:1.6">
                  Please keep this email for your records. Reply to this message if you need any help.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;border-top:1px solid #e8eef3;font-size:12px;color:#7a8b9a;line-height:1.7">
                <strong style="color:#0f2740;font-size:13px">${(0, mail_format_util_1.escapeHtml)(companyName)}</strong><br/>
                ${company?.address?.trim() ? `${(0, mail_format_util_1.escapeHtml)(company.address.trim())}<br/>` : ''}
                ${contactLine ? (0, mail_format_util_1.escapeHtml)(contactLine) : ''}
              </td>
            </tr>
          </table>
          <div style="max-width:620px;margin-top:12px;font-size:11px;color:#8a9aa8;text-align:center">
            This confirmation was sent because a tour was booked with ${(0, mail_format_util_1.escapeHtml)(companyName)}.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
    return { subject, text, html };
}
//# sourceMappingURL=booking-confirmation.template.js.map