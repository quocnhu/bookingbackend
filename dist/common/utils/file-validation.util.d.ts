export declare const ALLOWED_IMAGE_TYPES: string[];
export declare const ALLOWED_AVATAR_TYPES: string[];
export declare const MAX_FILE_SIZE: number;
export declare const MAX_AVATAR_SIZE: number;
export interface FileValidationResult {
    mime: string;
    ext: string;
}
export declare function validateFile(buffer: Buffer, allowedTypes: string[], maxSize: number): Promise<FileValidationResult>;
export declare function sanitizeFileName(originalName: string): string;
export declare function formatBytes(bytes: number): string;
