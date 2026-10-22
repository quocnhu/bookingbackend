"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyTourName = slugifyTourName;
exports.uniqueTourSlug = uniqueTourSlug;
function slugifyTourName(name) {
    const slug = name
        .normalize('NFD')
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
function uniqueTourSlug(name, taken) {
    const used = new Set(taken);
    const base = slugifyTourName(name);
    if (!used.has(base))
        return base;
    let suffix = 2;
    while (used.has(`${base}-${suffix}`))
        suffix += 1;
    return `${base}-${suffix}`;
}
//# sourceMappingURL=slug.util.js.map