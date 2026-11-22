"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyProfileService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const storage_1 = require("../storage");
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
let CompanyProfileService = class CompanyProfileService {
    prisma;
    auditService;
    storage;
    constructor(prisma, auditService, storage) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.storage = storage;
    }
    async getProfile() {
        return this.prisma.companyProfile.findFirst();
    }
    async updateProfile(dto, actor) {
        const existing = await this.prisma.companyProfile.findFirst();
        const profile = existing
            ? await this.prisma.companyProfile.update({
                where: { id: existing.id },
                data: dto,
            })
            : await this.prisma.companyProfile.create({
                data: dto,
            });
        await this.auditService.log({
            entityType: 'CompanyProfile',
            entityId: profile.id,
            action: 'UPDATE',
            beforeData: existing ?? undefined,
            afterData: profile,
            changedBy: actor.id,
        });
        return profile;
    }
    async updateLogo(file, actor) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (file.size > MAX_LOGO_BYTES) {
            throw new common_1.BadRequestException('The PNG icon must be 2 MB or smaller');
        }
        if (file.mimetype !== 'image/png' ||
            !PNG_SIGNATURE.every((byte, index) => file.buffer[index] === byte)) {
            throw new common_1.BadRequestException('Only PNG files are allowed');
        }
        const existing = await this.prisma.companyProfile.findFirst();
        if (!existing) {
            throw new common_1.BadRequestException('Save the company profile first, then upload the icon.');
        }
        const key = `company/logo-${Date.now()}.png`;
        const saved = await this.storage.save(key, file.buffer, {
            contentType: 'image/png',
        });
        const profile = await this.prisma.companyProfile.update({
            where: { id: existing.id },
            data: { logoUrl: saved.url },
        });
        await this.auditService.log({
            entityType: 'CompanyProfile',
            entityId: profile.id,
            action: 'UPDATE_LOGO',
            beforeData: { logoUrl: existing.logoUrl },
            afterData: {
                logoUrl: profile.logoUrl,
                fileName: file.originalname,
                size: file.size,
            },
            changedBy: actor.id,
        });
        return { logoUrl: profile.logoUrl };
    }
};
exports.CompanyProfileService = CompanyProfileService;
exports.CompanyProfileService = CompanyProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(storage_1.STORAGE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService, Object])
], CompanyProfileService);
//# sourceMappingURL=company-profile.service.js.map