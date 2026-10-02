import { BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png'];
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  mime: string;
  ext: string;
}

export async function validateFile(
  buffer: Buffer,
  allowedTypes: string[],
  maxSize: number,
): Promise<FileValidationResult> {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('Empty file');
  }

  if (buffer.length > maxSize) {
    throw new BadRequestException(`File too large. Max size: ${formatBytes(maxSize)}`);
  }

  const type = await fileTypeFromBuffer(buffer);
  if (!type || !allowedTypes.includes(type.mime)) {
    throw new BadRequestException(
      `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    );
  }

  return { mime: type.mime, ext: type.ext };
}

export function sanitizeFileName(originalName: string): string {
  // Use path.basename to prevent path traversal, then sanitize
  const baseName = originalName.split(/[\\/]/).pop() || 'file';
  return baseName
    .replace(/[^\w.\- ]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}