"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRootPath = uploadRootPath;
exports.publicUploadsBase = publicUploadsBase;
const fs_1 = require("fs");
const path_1 = require("path");
function uploadRootPath() {
    const configured = (process.env.UPLOAD_ROOT || '').trim();
    const root = configured
        ? (0, path_1.isAbsolute)(configured)
            ? configured
            : (0, path_1.resolve)(process.cwd(), configured)
        : (0, path_1.join)(process.cwd(), 'uploads');
    try {
        (0, fs_1.mkdirSync)(root, { recursive: true });
    }
    catch {
    }
    return root;
}
function publicUploadsBase() {
    const explicit = (process.env.PUBLIC_UPLOADS_BASE || '').trim();
    if (explicit)
        return explicit.replace(/\/+$/, '');
    const base = (process.env.BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
    return `${base}/uploads`;
}
//# sourceMappingURL=storage.config.js.map