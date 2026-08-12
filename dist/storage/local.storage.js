"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorage = void 0;
const fsp = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class LocalStorage {
    driver = 'local';
    root = path.join(process.cwd(), 'uploads');
    publicBase = process.env.PUBLIC_UPLOADS_BASE || 'http://localhost:4000/uploads';
    async save(key, buffer) {
        const abs = path.join(this.root, key);
        await fsp.mkdir(path.dirname(abs), { recursive: true });
        await fsp.writeFile(abs, buffer);
        return { key, url: this.url(key) };
    }
    async remove(key) {
        try {
            await fsp.unlink(path.join(this.root, key));
        }
        catch {
        }
    }
    async list(prefix) {
        const dir = path.join(this.root, prefix);
        let entries;
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true });
        }
        catch {
            return [];
        }
        const files = [];
        for (const entry of entries) {
            if (!entry.isFile())
                continue;
            const key = path.join(prefix, entry.name).split(path.sep).join('/');
            files.push({ key, url: this.url(key) });
        }
        return files;
    }
    async rename(fromKey, toKey) {
        const from = path.join(this.root, fromKey);
        const to = path.join(this.root, toKey);
        await fsp.mkdir(path.dirname(to), { recursive: true });
        await fsp.rename(from, to);
    }
    url(key) {
        return `${this.publicBase}/${key}`;
    }
}
exports.LocalStorage = LocalStorage;
//# sourceMappingURL=local.storage.js.map