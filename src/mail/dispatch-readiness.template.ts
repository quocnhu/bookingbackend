/** 20:00 readiness mail: one table of tomorrow's buses and their empty slots. */
import { escapeHtml, formatMailDate } from './mail-format.util';

export interface DispatchReadinessRow {
  bus: string;
  tour: string;
  departure: string;
  pax: number;
  guide: string;
  driver: string;
  vehicle: string;
  provider: string;
  issues: string[];
}

export interface DispatchReadinessCompany {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface DispatchReadinessData {
  dateKey: string;
  dateLabel: string;
  rows: DispatchReadinessRow[];
  actionLabel?: string | null;
  actionUrl?: string | null;
  company?: DispatchReadinessCompany | null;
}

export interface RenderedDispatchReadiness {
  subject: string;
  text: string;
  html: string;
}

export function renderDispatchReadiness(
  data: DispatchReadinessData,
): RenderedDispatchReadiness {
  const dateKey = data.dateKey.trim();
  const dateLabel = data.dateLabel.trim() || dateKey;
  const rows = data.rows ?? [];
  const issueCount = rows.filter((row) => row.issues.length > 0).length;
  const companyName = data.company?.name?.trim() || 'Hana Tourist';
  const subject = `[DISPATCH-${dateKey}] Tomorrow (${dateLabel}) — ${issueCount} bus(es) need attention`;

  const textLines = [
    `Tomorrow's dispatch readiness — ${dateLabel}`,
    `${issueCount} of ${rows.length} bus(es) still have empty places. Please check them before the dispatch cutoff.`,
    '',
  ];
  rows.forEach((row, index) => {
    textLines.push(
      `${index + 1}. ${row.bus} · ${row.tour} · ${row.departure} · ${row.pax} pax`,
    );
    textLines.push(`   Guide:    ${row.guide}`);
    textLines.push(`   Driver:   ${row.driver}`);
    textLines.push(`   Vehicle:  ${row.vehicle}`);
    textLines.push(`   Provider: ${row.provider}`);
    textLines.push(
      `   To check: ${row.issues.length ? row.issues.join('; ') : 'Ready'}`,
    );
    textLines.push('');
  });
  if (data.actionLabel && data.actionUrl) {
    textLines.push(`${data.actionLabel}: ${data.actionUrl}`);
  }
  textLines.push('', `— ${companyName}`);
  const text = textLines.join('\n');

  const rowHtml = rows
    .map((row) => {
      const cells: Array<[string, string]> = [
        ['Bus', row.bus],
        ['Tour', row.tour],
        ['Departure', row.departure],
        ['Pax', String(row.pax)],
        ['Guide', row.guide],
        ['Driver', row.driver],
        ['Vehicle', row.vehicle],
        ['Provider', row.provider],
      ];
      const body = cells
        .map(
          ([, value]) =>
            `<td style="border:1px solid #e2e8f0;padding:8px 10px;vertical-align:top;font-size:12px;color:${value === '-' ? '#dc2626' : '#0f172a'};font-weight:${value === '-' ? 700 : 400}">${escapeHtml(value)}</td>`,
        )
        .join('');
      const issues = row.issues.length
        ? row.issues
            .map(
              (issue) =>
                `<span style="display:inline-block;margin:0 4px 4px 0;padding:3px 7px;border-radius:5px;background:#fff1f0;color:#b42318;font-size:11px">${escapeHtml(issue)}</span>`,
            )
            .join('')
        : '<span style="display:inline-block;padding:3px 7px;border-radius:5px;background:#f0fdf4;color:#15803d;font-size:11px">Ready</span>';
      return `<tr>${body}<td style="border:1px solid #e2e8f0;padding:8px 10px;vertical-align:top">${issues}</td></tr>`;
    })
    .join('');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:1100px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(135deg,#22d3ee,#3b82f6);padding:18px 22px;border-radius:14px 14px 0 0;color:#fff">
      <h2 style="margin:0;font-size:19px">Tomorrow's dispatch readiness — ${escapeHtml(dateLabel)}</h2>
      <div style="margin-top:6px;font-size:12px;opacity:.9">${issueCount} of ${rows.length} bus(es) have empty places. Check them before the dispatch cutoff.</div>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:18px 22px">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <thead>
          <tr>
            ${[
              'Bus',
              'Tour',
              'Departure',
              'Pax',
              'Guide',
              'Driver',
              'Vehicle',
              'Provider',
              'To check',
            ]
              .map(
                (header) =>
                  `<th style="border:1px solid #e2e8f0;padding:8px 10px;background:#f8fafc;text-align:left;font-size:11px;color:#475569">${header}</th>`,
              )
              .join('')}
          </tr>
        </thead>
        <tbody>${rowHtml}</tbody>
      </table>
      ${
        data.actionLabel && data.actionUrl
          ? `<p style="margin:18px 0 0"><a href="${escapeHtml(data.actionUrl)}" style="display:inline-block;background:#1677ff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px">${escapeHtml(data.actionLabel)}</a></p>`
          : ''
      }
      <p style="margin:18px 0 0;font-size:11px;color:#64748b">Automated 20:00 check. Missing values are shown in red; buses with no issues are marked Ready. You cannot confirm from this email — sign in and use the dispatch board.</p>
      <p style="margin:12px 0 0;font-size:12px;color:#64748b">${escapeHtml(companyName)}${data.company?.phone ? ` · ${escapeHtml(data.company.phone)}` : ''}${data.company?.email ? ` · ${escapeHtml(data.company.email)}` : ''}</p>
    </div>
  </div>`;

  return { subject, text, html };
}

export function dispatchReadinessDeparture(
  date?: Date | string | null,
): string {
  const formatted = formatMailDate(date);
  if (formatted === '-') return formatted;
  const value = date instanceof Date ? date : new Date(date ?? '');
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(value);
  return `${formatted} ${time}`;
}
