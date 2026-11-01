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
exports.TourCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const slug_util_1 = require("../tours/slug.util");
let TourCategoriesService = class TourCategoriesService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async findAll(includeInactive = false) {
        return this.prisma.tourCategory.findMany({
            where: includeInactive ? undefined : { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { tours: true } } },
        });
    }
    async findOne(id) {
        const category = await this.prisma.tourCategory.findUnique({
            where: { id },
            include: { _count: { select: { tours: true } } },
        });
        if (!category)
            throw new common_1.NotFoundException('Category not found');
        return category;
    }
    async create(dto) {
        const name = dto.name?.trim();
        if (!name)
            throw new common_1.BadRequestException('Category name is required');
        const existing = await this.prisma.tourCategory.findUnique({
            where: { name },
        });
        if (existing)
            throw new common_1.ConflictException('Category name already exists');
        const category = await this.prisma.tourCategory.create({
            data: {
                name,
                slug: await this.nextSlug(dto.slug ?? name),
                description: dto.description ?? null,
                sortOrder: dto.sortOrder ?? (await this.nextSortOrder()),
                isActive: dto.isActive ?? true,
            },
        });
        await this.auditService.log({
            entityType: 'TourCategory',
            entityId: category.id,
            action: 'CREATE',
            afterData: category,
        });
        return category;
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        const name = dto.name?.trim();
        if (dto.name !== undefined && !name) {
            throw new common_1.BadRequestException('Category name is required');
        }
        if (name && name !== before.name) {
            const dup = await this.prisma.tourCategory.findFirst({
                where: { name, id: { not: id } },
            });
            if (dup)
                throw new common_1.ConflictException('Category name already exists');
        }
        const category = await this.prisma.tourCategory.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(dto.slug !== undefined
                    ? { slug: await this.nextSlug(dto.slug, id) }
                    : {}),
                ...(dto.description !== undefined
                    ? { description: dto.description ?? null }
                    : {}),
                ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
        });
        await this.auditService.log({
            entityType: 'TourCategory',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: category,
        });
        return category;
    }
    async remove(id) {
        const before = await this.findOne(id);
        await this.prisma.tourCategory.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'TourCategory',
            entityId: id,
            action: 'DELETE',
            beforeData: before,
        });
        return { message: 'Category deleted' };
    }
    async nextSortOrder() {
        const aggregate = await this.prisma.tourCategory.aggregate({
            _max: { sortOrder: true },
        });
        return (aggregate._max.sortOrder ?? 0) + 10;
    }
    async nextSlug(input, excludeId) {
        const taken = await this.prisma.tourCategory.findMany({
            where: excludeId ? { id: { not: excludeId } } : undefined,
            select: { slug: true },
        });
        return (0, slug_util_1.uniqueTourSlug)((0, slug_util_1.slugifyTourName)(input), taken.map((c) => c.slug));
    }
};
exports.TourCategoriesService = TourCategoriesService;
exports.TourCategoriesService = TourCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], TourCategoriesService);
//# sourceMappingURL=tour-categories.service.js.map