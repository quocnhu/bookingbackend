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
function createFileStorage() {
    const driver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
    const hasS3 = Boolean(process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY &&
        process.env.S3_SECRET_KEY);
    const useS3 = driver === 's3' || (driver !== 'local' && hasS3);
    if (useS3) {
        return new s3_storage_1.S3Storage({
            bucket: process.env.S3_BUCKET,
            region: process.env.S3_REGION || 'us-east-1',
            endpoint: process.env.S3_ENDPOINT || undefined,
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
            publicUrl: process.env.S3_PUBLIC_URL || undefined,
        });
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