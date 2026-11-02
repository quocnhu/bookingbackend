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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToursService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const storage_1 = require("../storage");
const sharp_1 = __importDefault(require("sharp"));
const file_validation_util_1 = require("../common/utils/file-validation.util");
const slug_util_1 = require("./slug.util");
let ToursService = class ToursService {
    prisma;
    auditService;
    storage;
    constructor(prisma, auditService, storage) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.storage = storage;
    }
    async findAll(query) {
        const { page, limit, type, category } = query;
        const where = {};
        if (type) {
            where.type = type;
        }
        if (category) {
            where.categories = {
                some: { category: { slug: category, isActive: true } },
            };
        }
        const [items, total] = await Promise.all([
            this.prisma.tour.findMany({
                where,
                include: {
                    typePrices: true,
                    privatePaxPrices: { orderBy: { pax: 'asc' } },
                    categories: { include: { category: true } },
                },
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.tour.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        const tour = await this.prisma.tour.findUnique({
            where: { id },
            include: {
                itineraries: { orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }] },
                typePrices: true,
                privatePaxPrices: { orderBy: { pax: 'asc' } },
                categories: { include: { category: true } },
                prices: { include: { provider: true } },
            },
        });
        if (!tour)
            throw new common_1.NotFoundException('Tour not found');
        return { ...tour, gallery: await this.listGallery(id) };
    }
    async findBySlug(slug) {
        const tour = await this.prisma.tour.findFirst({
            where: { OR: [{ slug }, { id: slug }] },
            include: {
                itineraries: { orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }] },
                typePrices: true,
                privatePaxPrices: { orderBy: { pax: 'asc' } },
                categories: { include: { category: true } },
                prices: { include: { provider: true } },
            },
        });
        if (!tour)
            throw new common_1.NotFoundException('Tour not found');
        return {
            ...tour,
            slug: tour.slug ?? slug,
            gallery: await this.listGallery(tour.id),
        };
    }
    async create(dto) {
        const existing = await this.prisma.tour.findUnique({
            where: { name: dto.name },
        });
        if (existing)
            throw new common_1.ConflictException('Tour name already exists');
        let code = dto.code;
        if (code) {
            const dup = await this.prisma.tour.findUnique({ where: { code } });
            if (dup)
                throw new common_1.ConflictException('Tour code already exists');
        }
        else {
            code = await this.generateTourCode(dto.name, dto.durationDays ?? 1);
        }
        const { typePrices, privatePaxPrices, categoryIds, primaryCategoryId, ...rest } = dto;
        const normalizedPrivatePaxPrices = this.normalizePrivatePaxPrices(privatePaxPrices);
        const offeredTypePrices = this.filterOfferedTypePrices(this.withPrivatePaxMirror(typePrices, normalizedPrivatePaxPrices));
        const categoryLinks = await this.resolveCategoryLinks(categoryIds, primaryCategoryId);
        const durationDays = this.resolveDurationDays(dto);
        const tour = await this.prisma.tour.create({
            data: {
                ...rest,
                ...this.resolveFreeCancellation(dto),
                durationDays: durationDays ?? dto.durationDays,
                departureTimes: this.normalizeDepartureTimes(dto.departureTimes),
                code,
                slug: await this.nextSlug(dto.name),
                typePrices: offeredTypePrices.length > 0
                    ? {
                        create: offeredTypePrices.map((tp) => ({
                            type: tp.type,
                            adultPrice: tp.adultPrice ?? 0,
                            childPrice: tp.childPrice ?? 0,
                            infantPrice: tp.infantPrice ?? 0,
                            currency: tp.currency ?? dto.currency ?? 'USD',
                        })),
                    }
                    : undefined,
                privatePaxPrices: normalizedPrivatePaxPrices && normalizedPrivatePaxPrices.length > 0
                    ? {
                        create: normalizedPrivatePaxPrices.map((price) => ({
                            pax: price.pax,
                            pricePerPerson: price.pricePerPerson ?? 0,
                            currency: price.currency ?? dto.currency ?? 'VND',
                        })),
                    }
                    : undefined,
                categories: categoryLinks && categoryLinks.length > 0
                    ? { create: categoryLinks }
                    : undefined,
            },
        });
        await this.auditService.log({
            entityType: 'Tour',
            entityId: tour.id,
            action: 'CREATE',
            afterData: tour,
        });
        return tour;
    }
    async generateTourCode(name, durationDays) {
        const words = name.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
        const initials = (words[0]?.[0] ?? 'X').toUpperCase() +
            (words[1]?.[0] ?? 'X').toUpperCase();
        const base = `TOUR-${initials}${durationDays}`;
        let code = base;
        let i = 2;
        while (await this.prisma.tour.findUnique({ where: { code } })) {
            code = `${base}-${i++}`;
        }
        return code;
    }
    normalizeDepartureTimes(times) {
        if (times === undefined)
            return undefined;
        return Array.from(new Set(times.map((t) => t.trim()).filter(Boolean))).sort();
    }
    resolveDurationDays(dto) {
        if (dto.durationDays != null)
            return dto.durationDays;
        if (dto.durationValue != null && dto.durationUnit) {
            return dto.durationUnit === 'DAY'
                ? dto.durationValue
                : Math.max(1, Math.ceil(dto.durationValue / 24));
        }
        return undefined;
    }
    filterOfferedTypePrices(typePrices) {
        return (typePrices ?? []).filter((price) => [price.adultPrice, price.childPrice, price.infantPrice].some((value) => Number(value ?? 0) > 0));
    }
    normalizePrivatePaxPrices(prices) {
        if (prices === undefined)
            return undefined;
        const byPax = new Map();
        for (const price of prices) {
            const pax = Number(price.pax);
            if (!Number.isInteger(pax) || pax < 1 || pax > 12)
                continue;
            byPax.set(pax, { ...price, pax });
        }
        return [...byPax.values()].sort((a, b) => a.pax - b.pax);
    }
    withPrivatePaxMirror(typePrices, privatePaxPrices) {
        if (privatePaxPrices === undefined)
            return typePrices;
        const base = (typePrices ?? []).filter((price) => price.type !== client_1.TourType.PRIVATE_TOUR);
        const first = privatePaxPrices.find((price) => price.pax === 1) ?? privatePaxPrices[0];
        if (!first || Number(first.pricePerPerson) <= 0)
            return base;
        return [
            ...base,
            {
                type: client_1.TourType.PRIVATE_TOUR,
                adultPrice: Number(first.pricePerPerson),
                childPrice: 0,
                infantPrice: 0,
                currency: first.currency,
            },
        ];
    }
    async resolveCategoryLinks(categoryIds, primaryCategoryId) {
        if (categoryIds === undefined)
            return undefined;
        const unique = Array.from(new Set(categoryIds.map((id) => id.trim()).filter(Boolean)));
        if (unique.length === 0)
            return [];
        const found = await this.prisma.tourCategory.findMany({
            where: { id: { in: unique } },
            select: { id: true },
        });
        if (found.length !== unique.length) {
            throw new common_1.BadRequestException('One or more selected categories do not exist');
        }
        const primary = primaryCategoryId && unique.includes(primaryCategoryId)
            ? primaryCategoryId
            : unique[0];
        return unique.map((categoryId) => ({
            categoryId,
            isPrimary: categoryId === primary,
        }));
    }
    resolveFreeCancellation(dto) {
        if (dto.freeCancellationValue != null && dto.freeCancellationUnit) {
            return {
                freeCancellationValue: dto.freeCancellationValue,
                freeCancellationUnit: dto.freeCancellationUnit,
                freeCancellationHours: dto.freeCancellationUnit === 'DAY'
                    ? dto.freeCancellationValue * 24
                    : dto.freeCancellationValue,
            };
        }
        if (dto.freeCancellationHours != null) {
            const hours = dto.freeCancellationHours;
            const useDays = hours > 0 && hours % 24 === 0;
            return {
                freeCancellationValue: useDays ? hours / 24 : hours,
                freeCancellationUnit: useDays ? 'DAY' : 'HOUR',
                freeCancellationHours: hours,
            };
        }
        return {};
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        if (dto.code && dto.code !== before.code) {
            const dup = await this.prisma.tour.findFirst({
                where: { code: dto.code, id: { not: id } },
            });
            if (dup)
                throw new common_1.ConflictException('Tour code already exists');
        }
        const { typePrices, privatePaxPrices, categoryIds, primaryCategoryId, ...rest } = dto;
        const normalizedPrivatePaxPrices = this.normalizePrivatePaxPrices(privatePaxPrices);
        const effectiveTypePrices = typePrices === undefined && normalizedPrivatePaxPrices !== undefined
            ? before.typePrices.map((tp) => ({
                type: tp.type,
                adultPrice: Number(tp.adultPrice),
                childPrice: Number(tp.childPrice),
                infantPrice: Number(tp.infantPrice),
                currency: tp.currency,
            }))
            : typePrices;
        const mirroredTypePrices = this.withPrivatePaxMirror(effectiveTypePrices, normalizedPrivatePaxPrices);
        const offeredTypePrices = mirroredTypePrices === undefined
            ? undefined
            : this.filterOfferedTypePrices(mirroredTypePrices);
        const categoryLinks = categoryIds === undefined
            ? undefined
            : await this.resolveCategoryLinks(categoryIds, primaryCategoryId);
        const durationDays = this.resolveDurationDays(dto);
        await this.prisma.$transaction([
            this.prisma.tour.update({
                where: { id },
                data: {
                    ...rest,
                    ...this.resolveFreeCancellation(dto),
                    durationDays: durationDays ?? dto.durationDays,
                    departureTimes: this.normalizeDepartureTimes(dto.departureTimes),
                    slug: before.slug ?? (await this.nextSlug(dto.name ?? before.name, id)),
                },
            }),
            ...(offeredTypePrices !== undefined
                ? [
                    this.prisma.tourTypePrice.deleteMany({
                        where: {
                            tourId: id,
                            type: {
                                notIn: offeredTypePrices.map((tp) => tp.type),
                            },
                        },
                    }),
                    ...offeredTypePrices.map((tp) => this.prisma.tourTypePrice.upsert({
                        where: { tourId_type: { tourId: id, type: tp.type } },
                        update: {
                            adultPrice: tp.adultPrice ?? 0,
                            childPrice: tp.childPrice ?? 0,
                            infantPrice: tp.infantPrice ?? 0,
                            currency: tp.currency ?? dto.currency ?? 'USD',
                        },
                        create: {
                            tourId: id,
                            type: tp.type,
                            adultPrice: tp.adultPrice ?? 0,
                            childPrice: tp.childPrice ?? 0,
                            infantPrice: tp.infantPrice ?? 0,
                            currency: tp.currency ?? dto.currency ?? 'USD',
                        },
                    })),
                ]
                : []),
            ...(normalizedPrivatePaxPrices !== undefined
                ? [
                    this.prisma.tourPrivatePaxPrice.deleteMany({
                        where: { tourId: id },
                    }),
                    ...(normalizedPrivatePaxPrices.length > 0
                        ? [
                            this.prisma.tourPrivatePaxPrice.createMany({
                                data: normalizedPrivatePaxPrices.map((price) => ({
                                    tourId: id,
                                    pax: price.pax,
                                    pricePerPerson: price.pricePerPerson ?? 0,
                                    currency: price.currency ?? dto.currency ?? 'VND',
                                })),
                            }),
                        ]
                        : []),
                ]
                : []),
            ...(categoryLinks !== undefined
                ? [
                    this.prisma.tourCategoryLink.deleteMany({ where: { tourId: id } }),
                    ...(categoryLinks.length > 0
                        ? [
                            this.prisma.tourCategoryLink.createMany({
                                data: categoryLinks.map((link) => ({
                                    ...link,
                                    tourId: id,
                                })),
                                skipDuplicates: true,
                            }),
                        ]
                        : []),
                ]
                : []),
        ]);
        const tour = await this.findOne(id);
        await this.auditService.log({
            entityType: 'Tour',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: tour,
        });
        return tour;
    }
    async nextSlug(name, excludeId) {
        const taken = await this.prisma.tour.findMany({
            where: excludeId ? { id: { not: excludeId } } : undefined,
            select: { slug: true },
        });
        return (0, slug_util_1.uniqueTourSlug)(name, taken.map((t) => t.slug).filter((s) => !!s));
    }
    async updateItinerary(id, dto, changedBy) {
        const before = await this.findOne(id);
        const items = dto.items ?? [];
        await this.prisma.$transaction([
            this.prisma.tourItinerary.deleteMany({ where: { tourId: id } }),
            this.prisma.tourItinerary.createMany({
                data: items.map((item) => ({
                    tourId: id,
                    dayNumber: item.dayNumber,
                    orderIndex: item.orderIndex,
                    title: item.title,
                    description: item.description ?? null,
                    timeSlot: item.timeSlot ?? null,
                    location: item.location ?? null,
                    imageUrl: item.imageUrl ?? null,
                    mapQuery: item.mapQuery ?? null,
                })),
            }),
        ]);
        const after = await this.findOne(id);
        await this.auditService.log({
            entityType: 'Tour',
            entityId: id,
            action: 'UPDATE_ITINERARY',
            beforeData: { itineraries: before.itineraries },
            afterData: { itineraries: after.itineraries },
            changedBy,
        });
        return after;
    }
    galleryPrefix(tourId) {
        return `tours/${tourId}/gallery`;
    }
    async listGallery(tourId) {
        const files = await this.storage.list(this.galleryPrefix(tourId));
        files.sort((a, b) => a.key.localeCompare(b.key));
        return files.map((f, index) => ({
            id: f.key.split('/').pop(),
            url: f.url,
            storageKey: f.key,
            sortIndex: index,
        }));
    }
    async uploadGallery(tourId, file, changedBy) {
        await this.findOne(tourId);
        if (!file?.buffer) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        await (0, file_validation_util_1.validateFile)(file.buffer, file_validation_util_1.ALLOWED_IMAGE_TYPES, file_validation_util_1.MAX_FILE_SIZE);
        let buffer;
        try {
            buffer = await (0, sharp_1.default)(file.buffer, { failOn: 'none' })
                .rotate()
                .resize(1920, 1440, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
        }
        catch {
            throw new common_1.BadRequestException('Could not process the image. Please upload a valid picture.');
        }
        const folder = this.galleryPrefix(tourId);
        const existing = await this.storage.list(folder);
        const padded = String(existing.length).padStart(3, '0');
        const baseName = (0, file_validation_util_1.sanitizeFileName)(file.originalname || 'photo').replace(/\.[^.]+$/, '');
        const storageKey = `${folder}/${padded}-${Date.now()}-${baseName}.webp`;
        await this.storage.save(storageKey, buffer, { contentType: 'image/webp' });
        await this.auditService.log({
            entityType: 'Tour',
            entityId: tourId,
            action: 'GALLERY_UPLOAD',
            afterData: { url: this.storage.url(storageKey) },
            changedBy,
        });
        return this.findOne(tourId);
    }
    async deleteGallery(tourId, file, changedBy) {
        const base = file.split('/').pop();
        if (base !== file)
            throw new common_1.BadRequestException('Invalid file name');
        await this.storage.remove(`${this.galleryPrefix(tourId)}/${base}`);
        await this.auditService.log({
            entityType: 'Tour',
            entityId: tourId,
            action: 'GALLERY_DELETE',
            afterData: { file: base },
            changedBy,
        });
        return this.findOne(tourId);
    }
    async reorderGallery(tourId, files) {
        await this.findOne(tourId);
        const folder = this.galleryPrefix(tourId);
        const entries = await this.storage.list(folder);
        const byName = new Map(entries.map((e) => [e.key.split('/').pop(), e.key]));
        for (const f of files) {
            if (!byName.has(f))
                throw new common_1.BadRequestException(`Unknown file: ${f}`);
        }
        for (let i = 0; i < files.length; i++) {
            const fromKey = byName.get(files[i]);
            const random = files[i].replace(/^\d+-/, '');
            const toKey = `${folder}/${String(i).padStart(3, '0')}-${random}`;
            if (fromKey !== toKey)
                await this.storage.rename(fromKey, toKey);
        }
        return this.findOne(tourId);
    }
    async remove(id, changedBy) {
        await this.findOne(id);
        const files = await this.storage.list(this.galleryPrefix(id));
        await Promise.all(files.map((f) => this.storage.remove(f.key)));
        await this.prisma.tour.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'Tour',
            entityId: id,
            action: 'DELETE',
            changedBy,
        });
        return { message: 'Tour deleted' };
    }
};
exports.ToursService = ToursService;
exports.ToursService = ToursService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(storage_1.STORAGE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService, Object])
], ToursService);
//# sourceMappingURL=tours.service.js.map