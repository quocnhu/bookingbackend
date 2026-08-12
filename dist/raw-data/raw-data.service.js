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
var RawDataService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawDataService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const raw_data_repository_1 = require("./raw-data.repository");
const raw_data_entity_1 = require("./raw-data.entity");
let RawDataService = RawDataService_1 = class RawDataService {
    repository;
    logger = new common_1.Logger(RawDataService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createIngested(input) {
        const existing = await this.repository.findBySourceId(input.sourceId);
        if (existing)
            return { id: existing.id };
        const payloadHash = this.hashPayload(input.payload);
        const raw = await this.repository.create({
            sourceId: input.sourceId,
            email: input.email,
            templateTag: input.templateTag,
            payloadHash,
            payload: input.payload,
        });
        this.logger.log(`Saved rawData ${raw.id} (${input.templateTag}) for ${input.sourceId}`);
        return { id: raw.id };
    }
    async markUnparsed(id) {
        await this.repository.updateStatus(id, raw_data_entity_1.RAW_DATA_STATUS.UNPARSED);
        this.logger.log(`rawData ${id} -> unparsed (manual review)`);
    }
    async markParseFailed(id, reason) {
        await this.appendReason(id, reason);
    }
    async markParsed(id, bookingId) {
        await this.repository.markParsed(id, bookingId);
    }
    async appendReason(id, reason) {
        const raw = await this.repository.findById(id);
        if (!raw)
            return;
        const payload = (raw.payload ?? {});
        await this.repository.updateStatus(id, raw_data_entity_1.RAW_DATA_STATUS.PARSE_FAILED, {
            payload: { ...payload, parseError: reason },
        });
    }
    hashPayload(payload) {
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(payload)).digest('hex');
    }
    async summary() {
        const statuses = [
            raw_data_entity_1.RAW_DATA_STATUS.PENDING,
            raw_data_entity_1.RAW_DATA_STATUS.PARSED,
            raw_data_entity_1.RAW_DATA_STATUS.UNPARSED,
            raw_data_entity_1.RAW_DATA_STATUS.PARSE_FAILED,
        ];
        const counts = {};
        for (const s of statuses)
            counts[s] = await this.repository.countByStatus(s);
        return counts;
    }
};
exports.RawDataService = RawDataService;
exports.RawDataService = RawDataService = RawDataService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [raw_data_repository_1.RawDataRepository])
], RawDataService);
//# sourceMappingURL=raw-data.service.js.map