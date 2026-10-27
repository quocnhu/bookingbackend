import { sanitizeFileName } from '@/common/utils/file-validation.util';

export function formatDateKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function userSlug(
  email?: string | null,
  name?: string | null,
  fallback?: string,
): string {
  const raw = email?.split('@')[0] || name || fallback || 'user';
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || fallback || 'user';
}

export function userStorageDir(
  userId: string,
  email?: string | null,
  name?: string | null,
): string {
  return `${userSlug(email, name, userId)}_${userId}`;
}

export function sanitizeFolderName(value: string): string {
  return (
    (value || '')
      .replace(/[\\/:*?"<>|\p{Cc}]+/gu, '-')
      .replace(/\s+/g, '-')
      .replace(/^[.\-\s]+|[.\-\s]+$/g, '')
      .slice(0, 80) || 'tour'
  );
}

export function tourFolderName(
  tourName: string,
  date: Date | string = new Date(),
): string {
  return `${formatDateKey(date)}_${sanitizeFolderName(tourName)}`;
}

export function storagePathSegment(value: string): string {
  const cleaned = (value || 'folder')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 120);
  return cleaned || 'folder';
}

export function pendingEvidencePrefix(
  userDir: string,
  assignmentId: string,
): string {
  return `pending-evidence/${userDir}/${assignmentId}/`;
}

export function pendingEvidenceKey(
  userDir: string,
  assignmentId: string,
  originalName: string,
): string {
  return `${pendingEvidencePrefix(userDir, assignmentId)}${Date.now()}-${sanitizeFileName(originalName)}`;
}
