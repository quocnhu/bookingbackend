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
var ParsingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsingProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const raw_data_repository_1 = require("../raw-data/raw-data.repository");
const raw_data_service_1 = require("../raw-data/raw-data.service");
const booking_service_1 = require("../booking/booking.service");
const parser_registry_1 = require("./parsers/parser-registry");
const parsing_queue_1 = require("./parsing.queue");
const booking_fields_schema_1 = require("./validation/booking-fields.schema");
let ParsingProcessor = ParsingProcessor_1 = class ParsingProcessor extends bullmq_1.WorkerHost {
    rawDataRepo;
    rawDataService;
    registry;
    bookingService;
    logger = new common_1.Logger(ParsingProcessor_1.name);
    constructor(rawDataRepo, rawDataService, registry, bookingService) {
        super();
        this.rawDataRepo = rawDataRepo;
        this.rawDataService = rawDataService;
        this.registry = registry;
        this.bookingService = bookingService;
    }
    async process(job) {
        const { rawDataId } = job.data;
        const raw = await this.rawDataRepo.findById(rawDataId);
        if (!raw)
            return { skipped: true, reason: 'RAW_DATA_NOT_FOUND' };
        if (raw.status === 'parsed')
            return { skipped: true, reason: 'ALREADY_PARSED' };
        const payload = (raw.payload ?? {});
        const parser = this.registry.resolve(payload, raw.templateTag);
        if (!parser) {
            await this.rawDataService.markUnparsed(rawDataId);
            return { status: 'unparsed', rawDataId };
        }
        const fields = parser.extract(payload);
        if (!fields) {
            await this.rawDataService.markParseFailed(rawDataId, `${parser.templateTag}:PARSER_NO_MATCH`);
            return {
                status: 'parse_failed',
                reason: `${parser.templateTag}:PARSER_NO_MATCH`,
            };
        }
        const validation = (0, booking_fields_schema_1.validateBookingFields)(fields);
        if (!validation.valid) {
            await this.rawDataService.markParseFailed(rawDataId, validation.errors.join('; '));
            return { status: 'parse_failed', reason: validation.errors.join('; ') };
        }
        if (payload.booking !== undefined) {
            await this.rawDataService.updatePayload(rawDataId, payload);
        }
        const booking = await this.bookingService.upsert(validation.data, rawDataId);
        await this.rawDataService.markParsed(rawDataId, booking.id);
        this.logger.log(`Parsed rawData ${rawDataId} (${parser.templateTag}) -> booking ${booking.bookingRef}`);
        return { status: 'parsed', bookingId: booking.id };
    }
};
exports.ParsingProcessor = ParsingProcessor;
exports.ParsingProcessor = ParsingProcessor = ParsingProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(parsing_queue_1.PARSE_QUEUE, { concurrency: 10 }),
    __metadata("design:paramtypes", [raw_data_repository_1.RawDataRepository,
        raw_data_service_1.RawDataService,
        parser_registry_1.ParserRegistry,
        booking_service_1.BookingService])
], ParsingProcessor);
//# sourceMappingURL=parsing.processor.js.map