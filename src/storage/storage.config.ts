import { mkdirSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

export function uploadRootPath(): string {
  const configured = (process.env.UPLOAD_ROOT || '').trim();
  const root = configured
    ? isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured)
    : join(process.cwd(), 'uploads');
  try {
    mkdirSync(root, { recursive: true });
  } catch {
    // the storage layer will surface a clear error on the first write
  }
  return root;
}

export function publicUploadsBase(): string {
  const explicit = (process.env.PUBLIC_UPLOADS_BASE || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const base = (process.env.BASE_URL || 'http://localhost:4000').replace(
    /\/+$/,
    '',
  );
  return `${base}/uploads`;
}
