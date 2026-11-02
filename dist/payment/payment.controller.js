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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../common/decorators/public.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const payment_service_1 = require("./payment.service");
const payment_dto_1 = require("./dto/payment.dto");
let PaymentController = class PaymentController {
    payments;
    constructor(payments) {
        this.payments = payments;
    }
    bookingPayments(query) {
        return this.payments.listBookingPayments(query);
    }
    paypalConfig() {
        return this.payments.publicConfig();
    }
    createOrder(dto, actor) {
        return this.payments.createPayPalOrder(dto.bookingId, actor);
    }
    cancelOrder(dto, actor) {
        return this.payments.cancelPayPalOrder(dto.bookingId, actor);
    }
    captureOrder(dto, actor) {
        return this.payments.capturePayPalOrder(dto.bookingId, dto.orderId, actor, dto.note);
    }
    recordOtaRemittance(dto, actor) {
        return this.payments.recordOtaRemittance(dto.bookingId, dto, actor);
    }
    webhook(req, headers) {
        const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
        return this.payments.verifyWebhook(headers, raw, req.body);
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Get)('bookings'),
    (0, permissions_decorator_1.Permissions)('accounting.read'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.QueryBookingPaymentsDto]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "bookingPayments", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('paypal/config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "paypalConfig", null);
__decorate([
    (0, common_1.Post)('paypal/orders'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.CreatePayPalOrderDto, Object]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Post)('paypal/cancel'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.CancelPayPalOrderDto, Object]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "cancelOrder", null);
__decorate([
    (0, common_1.Post)('paypal/capture'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.CapturePayPalOrderDto, Object]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "captureOrder", null);
__decorate([
    (0, common_1.Post)('ota/remittance'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.RecordOtaRemittanceDto, Object]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "recordOtaRemittance", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('paypal/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "webhook", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map