/** Operational transport-request alert mail (provider assignment warnings). */
import { escapeHtml } from './mail-format.util';

export interface TransportAlertCompany {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface TransportAlertData {
  title: string;
  message: string;
  reference?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  company?: TransportAlertCompany | null;
}

export interface RenderedTransportAlert {
  subject: string;
  text: string;
  html: string;
}

export function renderTransportAlert(
  data: TransportAlertData,
): RenderedTransportAlert {
  const title = data.title.trim() || 'Transport request update';
  const message = data.message.trim();
  const reference = (data.reference ?? '').trim();
  const companyName = data.company?.name?.trim() || 'Hana Tourist';
  const subject = reference ? `[${reference}] ${title}` : title;

  const action =
    data.actionLabel && data.actionUrl
      ? `${data.actionLabel}: ${data.actionUrl}`
      : '';
  const text = [
    title,
    '',
    message,
    reference ? `Reference: ${reference}` : '',
    action,
    '',
    `— ${companyName}`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(135deg,#22d3ee,#3b82f6);padding:18px 22px;border-radius:14px 14px 0 0;color:#fff">
      <h2 style="margin:0;font-size:19px">${escapeHtml(title)}</h2>
      ${reference ? `<div style="margin-top:6px;font-size:12px;opacity:.9">${escapeHtml(reference)}</div>` : ''}
    </div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:20px 22px">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;white-space:pre-line">${escapeHtml(message)}</p>
      ${
        data.actionLabel && data.actionUrl
          ? `<p style="margin:18px 0 0"><a href="${escapeHtml(data.actionUrl)}" style="display:inline-block;background:#1677ff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px">${escapeHtml(data.actionLabel)}</a></p>`
          : ''
      }
      <p style="margin:22px 0 0;font-size:12px;color:#64748b">${escapeHtml(companyName)}${data.company?.phone ? ` · ${escapeHtml(data.company.phone)}` : ''}${data.company?.email ? ` · ${escapeHtml(data.company.email)}` : ''}</p>
    </div>
  </div>`;

  return { subject, text, html };
}
