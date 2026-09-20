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
var BookingManualProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingManualProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const booking_service_1 = require("./booking.service");
const queue_constants_1 = require("@/queues/queue.constants");
let BookingManualProcessor = BookingManualProcessor_1 = class BookingManualProcessor extends bullmq_1.WorkerHost {
    bookingService;
    logger = new common_1.Logger(BookingManualProcessor_1.name);
    constructor(bookingService) {
        super();
        this.bookingService = bookingService;
    }
    async process(job) {
        const { data, actorId } = job.data;
        const booking = await this.bookingService.createManual(data, actorId);
        this.logger.log(`Created manual booking ${booking.bookingRef}`);
        return {
            created: true,
            bookingId: booking.id,
            bookingRef: booking.bookingRef,
        };
    }
};
exports.BookingManualProcessor = BookingManualProcessor;
exports.BookingManualProcessor = BookingManualProcessor = BookingManualProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(queue_constants_1.BOOKING_MANUAL_QUEUE, { concurrency: 20 }),
    __metadata("design:paramtypes", [booking_service_1.BookingService])
], BookingManualProcessor);
//# sourceMappingURL=booking-manual.processor.js.map