export const MAIL_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMailDate(value?: Date | string | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: MAIL_TIME_ZONE,
  }).format(date);
}

export function formatMoney(
  value: number | string | null | undefined,
  currency: string,
): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '-';
  const code = (currency || 'VND').toUpperCase();
  if (code === 'VND') {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} ₫`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)} ${code}`;
  }
}

export function formatDuration(days?: number | null): string {
  const value = Number(days ?? 0);
  if (!Number.isFinite(value) || value <= 0) return '-';
  return value === 1 ? '1 day' : `${value} days`;
}

/** Avoid "Company.." when the profile name already ends with punctuation. */
export function asSentence(name: string): string {
  return /[.!?]$/.test(name) ? name : `${name}.`;
}
