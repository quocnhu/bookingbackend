"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_AVATAR_SIZE = exports.MAX_FILE_SIZE = exports.ALLOWED_AVATAR_TYPES = exports.ALLOWED_IMAGE_TYPES = void 0;
exports.validateFile = validateFile;
exports.sanitizeFileName = sanitizeFileName;
exports.formatBytes = formatBytes;
const common_1 = require("@nestjs/common");
const file_type_1 = require("file-type");
exports.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
exports.ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png'];
exports.MAX_FILE_SIZE = 15 * 1024 * 1024;
exports.MAX_AVATAR_SIZE = 5 * 1024 * 1024;
async function validateFile(buffer, allowedTypes, maxSize) {
    if (!buffer || buffer.length === 0) {
        throw new common_1.BadRequestException('Empty file');
    }
    if (buffer.length > maxSize) {
        throw new common_1.BadRequestException(`File too large. Max size: ${formatBytes(maxSize)}`);
    }
    const type = await (0, file_type_1.fileTypeFromBuffer)(buffer);
    if (!type || !allowedTypes.includes(type.mime)) {
        throw new common_1.BadRequestException(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }
    return { mime: type.mime, ext: type.ext };
}
function sanitizeFileName(originalName) {
    const baseName = originalName.split(/[\\/]/).pop() || 'file';
    return baseName
        .replace(/[^\w.\- ]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 255);
}
function formatBytes(bytes) {
    if (bytes >= 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}
//# sourceMappingURL=file-validation.util.js.map