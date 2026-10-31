const EMAIL_RE = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

export function emailFromHeader(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const first = value.split(',')[0]?.trim();
  if (!first) return undefined;
  const bracketed = /<([^<>]+)>/.exec(first);
  const candidate = (bracketed?.[1] ?? first)
    .trim()
    .replace(/^mailto:/i, '');
  return EMAIL_RE.test(candidate) ? candidate : undefined;
}
