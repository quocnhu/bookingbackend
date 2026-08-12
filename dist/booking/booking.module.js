"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModule = void 0;
const common_1 = require("@nestjs/common");
const booking_controller_1 = require("./booking.controller");
const booking_service_1 = require("./booking.service");
const booking_manual_processor_1 = require("./booking-manual.processor");
const booking_normalizer_service_1 = require("../parsing/booking-normalizer.service");
const audit_module_1 = require("../audit/audit.module");
const queues_module_1 = require("../queues/queues.module");
let BookingModule = class BookingModule {
};
exports.BookingModule = BookingModule;
exports.BookingModule = BookingModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule, queues_module_1.QueuesModule],
        controllers: [booking_controller_1.BookingController],
        providers: [
            booking_service_1.BookingService,
            booking_manual_processor_1.BookingManualProcessor,
            booking_normalizer_service_1.BookingNormalizerService,
        ],
        exports: [booking_service_1.BookingService, booking_normalizer_service_1.BookingNormalizerService],
    })
], BookingModule);
//# sourceMappingURL=booking.module.js.map