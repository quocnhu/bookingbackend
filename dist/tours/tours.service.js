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
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const storage_1 = require("../storage");
const sharp_1 = __importDefault(require("sharp"));
const MAX_GALLERY_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_GALLERY_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
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
        const { page, limit, q, type } = query;
        const where = {};
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (type) {
            where.type = type;
        }
        const [items, total] = await Promise.all([
            this.prisma.tour.findMany({
                where,
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
                prices: { include: { provider: true } },
            },
        });
        if (!tour)
            throw new common_1.NotFoundException('Tour not found');
        return { ...tour, gallery: await this.listGallery(id) };
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
        const tour = await this.prisma.tour.create({ data: { ...dto, code } });
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
    async update(id, dto) {
        const before = await this.findOne(id);
        if (dto.code && dto.code !== before.code) {
            const dup = await this.prisma.tour.findFirst({
                where: { code: dto.code, id: { not: id } },
            });
            if (dup)
                throw new common_1.ConflictException('Tour code already exists');
        }
        const tour = await this.prisma.tour.update({ where: { id }, data: dto });
        await this.auditService.log({
            entityType: 'Tour',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: tour,
        });
        return tour;
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
        const mime = (file.mimetype || '').toLowerCase();
        if (!ALLOWED_GALLERY_TYPES.includes(mime)) {
            throw new common_1.BadRequestException('Gallery only accepts JPG, PNG or WEBP images');
        }
        if (file.size > MAX_GALLERY_IMAGE_BYTES) {
            throw new common_1.BadRequestException('Max image size is 15MB');
        }
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
        const baseName = (file.originalname || 'photo')
            .split('/')
            .pop()
            .replace(/[^\w.\- ]/g, '_')
            .replace(/\.[^.]+$/, '');
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