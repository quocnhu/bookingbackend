export declare function formatDateKey(date?: Date | string): string;
export declare function userSlug(email?: string | null, name?: string | null, fallback?: string): string;
export declare function userStorageDir(userId: string, email?: string | null, name?: string | null): string;
export declare function sanitizeFolderName(value: string): string;
export declare function tourFolderName(tourName: string, date?: Date | string): string;
export declare function storagePathSegment(value: string): string;
export declare function pendingEvidencePrefix(userDir: string, assignmentId: string): string;
export declare function pendingEvidenceKey(userDir: string, assignmentId: string, originalName: string): string;
