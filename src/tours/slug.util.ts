/**
 * The public address of a tour page: /tour/ha-long-bay-full-day-cruise
 *
 * A slug is keyword-rich (it repeats the tour name in the URL) and stable —
 * it is generated once and kept when the tour is renamed, so the links that
 * Google has already indexed never break.
 */
export function slugifyTourName(name: string): string {
  const slug = name
    .normalize('NFD')
    // strip the diacritics: "Hạ Long" → "Ha Long"
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return slug || 'tour';
}

/**
 * A slug that is not taken yet: "ha-long-bay" → "ha-long-bay-2".
 *
 * @param taken the slugs that already exist
 */
export function uniqueTourSlug(
  name: string,
  taken: Iterable<string>,
): string {
  const used = new Set(taken);
  const base = slugifyTourName(name);
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
