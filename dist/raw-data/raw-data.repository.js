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
    markParsed(id, bookingId) {
        return this.prisma.rawData.update({
            where: { id },
            data: { status: 'parsed', booking: { connect: { id: bookingId } } },
        });
    }
    countByStatus(status) {
        return this.prisma.rawData.count({ where: { status } });
    }
};
exports.RawDataRepository = RawDataRepository;
exports.RawDataRepository = RawDataRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RawDataRepository);
//# sourceMappingURL=raw-data.repository.js.map