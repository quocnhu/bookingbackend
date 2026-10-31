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
const booking_forward_service_1 = require("../booking/booking-forward.service");
const parser_registry_1 = require("./parsers/parser-registry");
const parsing_queue_1 = require("./parsing.queue");
const booking_fields_schema_1 = require("./validation/booking-fields.schema");
const email_util_1 = require("./email.util");
const FORWARD_OUTCOMES = new Set([
    'CREATED',
    'UPDATED',
    'CANCELLED',
    'SKIPPED',
    'UNCHANGED',
]);
let ParsingProcessor = ParsingProcessor_1 = class ParsingProcessor extends bullmq_1.WorkerHost {
    rawDataRepo;
    rawDataService;
    registry;
    bookingService;
    bookingForward;
    logger = new common_1.Logger(ParsingProcessor_1.name);
    constructor(rawDataRepo, rawDataService, registry, bookingService, bookingForward) {
        super();
        this.rawDataRepo = rawDataRepo;
        this.rawDataService = rawDataService;
        this.registry = registry;
        this.bookingService = bookingService;
        this.bookingForward = bookingForward;
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
        if (!fields.mail?.trim()) {
            const senderMail = (0, email_util_1.emailFromHeader)(payload.from);
            if (senderMail) {
                fields.mail = senderMail;
                fields.extra = { ...(fields.extra ?? {}), mailSource: 'sender-fallback' };
            }
        }
        const validation = (0, booking_fields_schema_1.validateBookingFields)(fields);
        if (!validation.valid) {
            await this.rawDataService.markParseFailed(rawDataId, validation.errors.join('; '));
            return { status: 'parse_failed', reason: validation.errors.join('; ') };
        }
        if (payload.booking !== undefined) {
            await this.rawDataService.updatePayload(rawDataId, payload);
        }
        const { booking, outcome } = await this.bookingService.upsert(validation.data, rawDataId, undefined, undefined, this.resolveEmailDate(payload));
        const isDuplicate = outcome === 'UNCHANGED' || outcome === 'SKIPPED';
        if (isDuplicate) {
            const earlierDuplicates = await this.rawDataRepo.countDuplicateRowsForBooking(booking.id);
            if (earlierDuplicates > 0) {
                await this.rawDataRepo.delete(rawDataId);
                this.logger.log(`Blocked duplicate mail ${rawDataId} for booking ${booking.bookingRef} — an earlier duplicate was already recorded`);
                return { status: 'duplicate_blocked', bookingId: booking.id };
            }
        }
        const displayAction = isDuplicate ? 'DUPLICATE' : validation.data.action;
        await this.rawDataService.markParsed(rawDataId, booking.id, displayAction, outcome);
        this.logger.log(`Parsed rawData ${rawDataId} (${parser.templateTag}) -> booking ${booking.bookingRef} [${validation.data.action}/${outcome}]`);
        if (FORWARD_OUTCOMES.has(outcome)) {
            await this.bookingForward.forward({
                bookingRef: booking.bookingRef,
                source: validation.data.source,
                action: validation.data.action,
                outcome,
                mailbox: this.str(payload.emailAddress) ?? '',
                messageId: this.str(payload.messageId),
                threadId: this.str(payload.threadId),
                rfcMessageId: this.str(payload.rfcMessageId),
                subject: this.str(payload.subject),
                from: this.str(payload.from),
                date: this.str(payload.date),
                body: this.str(payload.body),
            });
        }
        return { status: 'parsed', bookingId: booking.id };
    }
    str(value) {
        return typeof value === 'string' && value.trim() ? value : undefined;
    }
    resolveEmailDate(payload) {
        const ms = Number(payload.internalDate);
        if (Number.isFinite(ms) && ms > 0)
            return new Date(ms);
        const raw = typeof payload.date === 'string' ? payload.date : undefined;
        if (raw) {
            const d = new Date(raw);
            if (!Number.isNaN(d.getTime()))
                return d;
        }
        return undefined;
    }
};
exports.ParsingProcessor = ParsingProcessor;
exports.ParsingProcessor = ParsingProcessor = ParsingProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(parsing_queue_1.PARSE_QUEUE, { concurrency: 10 }),
    __metadata("design:paramtypes", [raw_data_repository_1.RawDataRepository,
        raw_data_service_1.RawDataService,
        parser_registry_1.ParserRegistry,
        booking_service_1.BookingService,
        booking_forward_service_1.BookingForwardService])
], ParsingProcessor);
//# sourceMappingURL=parsing.processor.js.map