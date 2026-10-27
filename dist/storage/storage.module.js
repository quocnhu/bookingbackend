"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = void 0;
const common_1 = require("@nestjs/common");
const storage_types_1 = require("./storage.types");
const local_storage_1 = require("./local.storage");
const s3_storage_1 = require("./s3.storage");
function supabaseConfig() {
    const base = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    if (!base) {
        throw new Error('STORAGE_DRIVER=supabase requires SUPABASE_URL to be set');
    }
    const bucket = (process.env.SUPABASE_STORAGE_BUCKET || '').trim() || 'booking';
    const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID ||
        process.env.SUPABASE_ACCESS_KEY_ID ||
        process.env.SUPABASE_ACCESS_KEY;
    const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY ||
        process.env.SUPABASE_SECRET_ACCESS_KEY ||
        process.env.SUPABASE_SECRET_KEY;
    return {
        bucket,
        region: process.env.SUPABASE_REGION || 'us-east-1',
        endpoint: process.env.SUPABASE_S3_ENDPOINT || `${base}/storage/v1/s3`,
        accessKeyId,
        secretAccessKey,
        forcePathStyle: process.env.SUPABASE_FORCE_PATH_STYLE !== 'false',
        publicUrl: process.env.SUPABASE_PUBLIC_URL ||
            `${base}/storage/v1/object/public/${bucket}`,
        driver: 'supabase',
    };
}
function s3Config() {
    return {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || undefined,
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        publicUrl: process.env.S3_PUBLIC_URL || undefined,
        driver: 's3',
    };
}
function hasS3Config() {
    return Boolean(process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY &&
        process.env.S3_SECRET_KEY);
}
function hasSupabaseConfig() {
    return Boolean(process.env.SUPABASE_URL &&
        (process.env.SUPABASE_S3_ACCESS_KEY_ID ||
            process.env.SUPABASE_ACCESS_KEY_ID ||
            process.env.SUPABASE_ACCESS_KEY) &&
        (process.env.SUPABASE_S3_SECRET_ACCESS_KEY ||
            process.env.SUPABASE_SECRET_ACCESS_KEY ||
            process.env.SUPABASE_SECRET_KEY));
}
function createFileStorage() {
    const driver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
    if (driver === 'local') {
        return new local_storage_1.LocalStorage();
    }
    if (driver === 's3') {
        return new s3_storage_1.S3Storage(s3Config());
    }
    if (driver === 'supabase') {
        return new s3_storage_1.S3Storage(supabaseConfig());
    }
    if (hasSupabaseConfig()) {
        return new s3_storage_1.S3Storage(supabaseConfig());
    }
    if (hasS3Config()) {
        return new s3_storage_1.S3Storage(s3Config());
    }
    return new local_storage_1.LocalStorage();
}
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [{ provide: storage_types_1.STORAGE, useFactory: createFileStorage }],
        exports: [storage_types_1.STORAGE],
    })
], StorageModule);
//# sourceMappingURL=storage.module.js.map