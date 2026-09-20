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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyProfileService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("@/prisma/prisma.service");
const audit_service_1 = require("@/audit/audit.service");
let CompanyProfileService = class CompanyProfileService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
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
};
exports.CompanyProfileService = CompanyProfileService;
exports.CompanyProfileService = CompanyProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CompanyProfileService);
//# sourceMappingURL=company-profile.service.js.map