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
exports.CoordinatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let CoordinatesService = class CoordinatesService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {};
        const [items, total] = await Promise.all([
            this.prisma.coordinate.findMany({
                where,
                orderBy: { hotelName: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.coordinate.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        const coordinate = await this.prisma.coordinate.findUnique({ where: { id } });
        if (!coordinate)
            throw new common_1.NotFoundException('Coordinate not found');
        return coordinate;
    }
    async create(dto) {
        const existing = await this.prisma.coordinate.findUnique({
            where: { address: dto.address },
        });
        if (existing)
            throw new common_1.ConflictException('Address already exists');
        const coordinate = await this.prisma.coordinate.create({ data: dto });
        await this.auditService.log({
            entityType: 'Coordinate',
            entityId: coordinate.id,
            action: 'CREATE',
            afterData: coordinate,
        });
        return coordinate;
    }
    async update(id, dto) {
        const before = await this.findOne(id);
        if (dto.address && dto.address !== before.address) {
            const dup = await this.prisma.coordinate.findFirst({
                where: { address: dto.address, id: { not: id } },
            });
            if (dup)
                throw new common_1.ConflictException('Address already exists');
        }
        const coordinate = await this.prisma.coordinate.update({ where: { id }, data: dto });
        await this.auditService.log({
            entityType: 'Coordinate',
            entityId: id,
            action: 'UPDATE',
            beforeData: before,
            afterData: coordinate,
        });
        return coordinate;
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.coordinate.delete({ where: { id } });
        await this.auditService.log({
            entityType: 'Coordinate',
            entityId: id,
            action: 'DELETE',
        });
        return { message: 'Coordinate deleted' };
    }
};
exports.CoordinatesService = CoordinatesService;
exports.CoordinatesService = CoordinatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CoordinatesService);
//# sourceMappingURL=coordinates.service.js.map