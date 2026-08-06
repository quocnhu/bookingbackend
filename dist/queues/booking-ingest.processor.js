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
var BookingIngestProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingIngestProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const booking_writer_service_1 = require("./booking-writer.service");
const queue_constants_1 = require("./queue.constants");
let BookingIngestProcessor = BookingIngestProcessor_1 = class BookingIngestProcessor extends bullmq_1.WorkerHost {
    writer;
    logger = new common_1.Logger(BookingIngestProcessor_1.name);
    constructor(writer) {
        super();
        this.writer = writer;
    }
    async process(job) {
        const { rawDataId } = job.data;
        const result = await this.writer.writeFromRawData(rawDataId);
        this.logger.log(`Ingested rawData ${rawDataId} -> ${result.status}${result.booking ? ` booking=${result.booking.bookingRef}` : ''}`);
        return result;
    }
};
exports.BookingIngestProcessor = BookingIngestProcessor;
exports.BookingIngestProcessor = BookingIngestProcessor = BookingIngestProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(queue_constants_1.BOOKING_INGEST_QUEUE, { concurrency: 25 }),
    __metadata("design:paramtypes", [booking_writer_service_1.BookingWriterService])
], BookingIngestProcessor);
//# sourceMappingURL=booking-ingest.processor.js.map