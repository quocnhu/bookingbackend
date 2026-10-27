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
exports.RawDataRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RawDataRepository = class RawDataRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) {
        return this.prisma.rawData.create({
            data: {
                sourceId: data.sourceId,
                email: data.email,
                templateTag: data.templateTag,
                payloadHash: data.payloadHash,
                payload: data.payload,
                status: 'pending',
            },
        });
    }
    findById(id) {
        return this.prisma.rawData.findUnique({ where: { id } });
    }
    findBySourceId(sourceId) {
        return this.prisma.rawData.findUnique({ where: { sourceId } });
    }
    updateStatus(id, status, extra = {}) {
        return this.prisma.rawData.update({
            where: { id },
            data: { status, ...extra },
        });
    }
    updatePayload(id, payload) {
        return this.prisma.rawData.update({
            where: { id },
            data: { payload },
        });
    }
    markParsed(id, bookingId, action, outcome) {
        return this.prisma.rawData.update({
            where: { id },
            data: {
                status: 'parsed',
                action: action ?? undefined,
                outcome: outcome ?? undefined,
                linkedBooking: { connect: { id: bookingId } },
                ...(outcome === 'CREATED'
                    ? { booking: { connect: { id: bookingId } } }
                    : {}),
            },
        });
    }
    countDuplicateRowsForBooking(bookingId) {
        return this.prisma.rawData.count({
            where: {
                linkedBookingId: bookingId,
                outcome: { in: ['UNCHANGED', 'SKIPPED'] },
            },
        });
    }
    delete(id) {
        return this.prisma.rawData.delete({ where: { id } });
    }
    countByStatus(status) {
        return this.prisma.rawData.count({ where: { status } });
    }
    async countByField(field) {
        const rows = await this.prisma.rawData.groupBy({
            by: [field],
            _count: { _all: true },
        });
        const counts = {};
        for (const row of rows) {
            const value = row[field];
            if (value)
                counts[value] = row._count._all;
        }
        return counts;
    }
};
exports.RawDataRepository = RawDataRepository;
exports.RawDataRepository = RawDataRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RawDataRepository);
//# sourceMappingURL=raw-data.repository.js.map