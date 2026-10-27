"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateKey = formatDateKey;
exports.userSlug = userSlug;
exports.userStorageDir = userStorageDir;
exports.sanitizeFolderName = sanitizeFolderName;
exports.tourFolderName = tourFolderName;
exports.storagePathSegment = storagePathSegment;
exports.pendingEvidencePrefix = pendingEvidencePrefix;
exports.pendingEvidenceKey = pendingEvidenceKey;
const file_validation_util_1 = require("./file-validation.util");
function formatDateKey(date = new Date()) {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
}
function userSlug(email, name, fallback) {
    const raw = email?.split('@')[0] || name || fallback || 'user';
    const slug = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || fallback || 'user';
}
function userStorageDir(userId, email, name) {
    return `${userSlug(email, name, userId)}_${userId}`;
}
function sanitizeFolderName(value) {
    return ((value || '')
        .replace(/[\\/:*?"<>|\p{Cc}]+/gu, '-')
        .replace(/\s+/g, '-')
        .replace(/^[.\-\s]+|[.\-\s]+$/g, '')
        .slice(0, 80) || 'tour');
}
function tourFolderName(tourName, date = new Date()) {
    return `${formatDateKey(date)}_${sanitizeFolderName(tourName)}`;
}
function storagePathSegment(value) {
    const cleaned = (value || 'folder')
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\p{Cc}/gu, '')
        .replace(/\s+/g, '_')
        .replace(/^[.-]+|[.-]+$/g, '')
        .slice(0, 120);
    return cleaned || 'folder';
}
function pendingEvidencePrefix(userDir, assignmentId) {
    return `pending-evidence/${userDir}/${assignmentId}/`;
}
function pendingEvidenceKey(userDir, assignmentId, originalName) {
    return `${pendingEvidencePrefix(userDir, assignmentId)}${Date.now()}-${(0, file_validation_util_1.sanitizeFileName)(originalName)}`;
}
//# sourceMappingURL=storage-key.util.js.map