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
var RawDataProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawDataProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const queue_constants_1 = require("./queue.constants");
let RawDataProcessor = RawDataProcessor_1 = class RawDataProcessor extends bullmq_1.WorkerHost {
    prisma;
    logger = new common_1.Logger(RawDataProcessor_1.name);
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async process(job) {
        const { sourceId, payload, status = 'PENDING' } = job.data;
        try {
            const saved = await this.prisma.rawData.create({
                data: { sourceId, payload, status },
            });
            this.logger.log(`Saved rawData ${saved.id} for ${sourceId}`);
            return { saved: true, id: saved.id };
        }
        catch (error) {
            this.logger.error(`Failed to save rawData for ${sourceId}`, error);
            throw error;
        }
    }
};
exports.RawDataProcessor = RawDataProcessor;
exports.RawDataProcessor = RawDataProcessor = RawDataProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(queue_constants_1.RAW_DATA_QUEUE),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RawDataProcessor);
//# sourceMappingURL=raw-data.processor.js.map