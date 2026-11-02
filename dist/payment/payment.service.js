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
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const schedule_1 = require("@nestjs/schedule");
let PaymentService = PaymentService_1 = class PaymentService {
    prisma;
    audit;
    logger = new common_1.Logger(PaymentService_1.name);
    tokenCache = null;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    get mode() {
        return (process.env.PAYPAL_MODE ?? 'sandbox').toLowerCase() === 'live'
            ? 'live'
            : 'sandbox';
    }
    get baseUrl() {
        return this.mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }
    get clientId() {
        return process.env.PAYPAL_CLIENT_ID?.trim() ?? '';
    }
    get clientSecret() {
        return process.env.PAYPAL_CLIENT_SECRET?.trim() ?? '';
    }
    get currency() {
        return (process.env.PAYPAL_CURRENCY ?? 'USD').toUpperCase();
    }
    get vndPerUsd() {
        return Number(process.env.PAYPAL_VND_PER_USD ?? 25000);
    }
    isConfigured() {
        return !!this.clientId && !!this.clientSecret;
    }
    publicConfig() {
        return {
            enabled: this.isConfigured(),
            provider: 'paypal',
            mode: this.mode,
            clientId: this.clientId || null,
            currency: this.currency,
            vndPerUsd: this.vndPerUsd,
        };
    }
    pendingTtlMinutes() {
        const value = Number(process.env.PAYPAL_PENDING_TTL_MINUTES ?? 180);
        return Number.isFinite(value) && value >= 5 ? value : 180;
    }
    async expireStalePayPalPaymentsJob() {
        try {
            await this.expireStalePayPalPayments();
        }
        catch (e) {
            this.logger.warn(`PayPal pending cleanup failed: ${e.message}`);
        }
    }
    async expireStalePayPalPayments() {
        const cutoff = new Date(Date.now() - this.pendingTtlMinutes() * 60 * 1000);
        const stale = await this.prisma.bookingPayment.findMany({
            where: {
                provider: 'PAYPAL',
                status: client_1.PaymentRecordStatus.PENDING,
                createdAt: { lt: cutoff },
            },
            select: { id: true, bookingId: true, providerOrderId: true },
        });
        if (stale.length === 0)
            return 0;
        await this.prisma.bookingPayment.updateMany({
            where: { id: { in: stale.map((p) => p.id) } },
            data: {
                status: client_1.PaymentRecordStatus.FAILED,
                note: `PayPal order expired after ${this.pendingTtlMinutes()} minutes without approval`,
            },
        });
        await this.audit.log({
            entityType: 'BookingPayment',
            entityId: stale.map((p) => p.id).join(','),
            action: 'PAYPAL_ORDERS_EXPIRED',
            afterData: {
                count: stale.length,
                orders: stale.map((p) => p.providerOrderId).filter(Boolean),
            },
            changedBy: null,
        });
        return stale.length;
    }
    async cancelPayPalOrder(bookingId, actor) {
        const booking = await this.bookingForCustomer(bookingId, actor);
        const result = await this.prisma.bookingPayment.updateMany({
            where: {
                bookingId: booking.id,
                provider: 'PAYPAL',
                status: client_1.PaymentRecordStatus.PENDING,
            },
            data: {
                status: client_1.PaymentRecordStatus.FAILED,
                note: 'PayPal checkout was cancelled before payment',
            },
        });
        if (result.count > 0) {
            await this.audit.log({
                entityType: 'BookingPayment',
                entityId: booking.id,
                action: 'PAYPAL_ORDER_CANCELLED',
                afterData: { bookingRef: booking.bookingRef, count: result.count },
                changedBy: actor.id,
            });
        }
        return { cancelled: result.count };
    }
    async listBookingPayments(query) {
        await this.expireStalePayPalPayments();
        const { page, limit, payment, channel, search } = query;
        const where = {};
        if (payment)
            where.payment = payment;
        if (channel)
            where.channel = channel;
        const q = search?.trim();
        if (q) {
            where.OR = [
                { bookingRef: { contains: q, mode: 'insensitive' } },
                { confirmationCode: { contains: q, mode: 'insensitive' } },
                { customerName: { contains: q, mode: 'insensitive' } },
                { mail: { contains: q, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                include: {
                    tour: { select: { id: true, name: true, type: true } },
                    customerUser: { select: { id: true, name: true, email: true } },
                    payments: { orderBy: { createdAt: 'desc' } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.booking.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    assertConfigured() {
        if (!this.isConfigured()) {
            throw new common_1.ServiceUnavailableException('PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
        }
    }
    async accessToken() {
        this.assertConfigured();
        const now = Date.now();
        if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
            return this.tokenCache.value;
        }
        const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
            signal: AbortSignal.timeout(15_000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.access_token) {
            this.logger.error(`PayPal token failed: ${res.status} ${JSON.stringify(body)}`);
            throw new common_1.BadGatewayException('PayPal authentication failed');
        }
        this.tokenCache = {
            value: body.access_token,
            expiresAt: now + Number(body.expires_in ?? 3000) * 1000,
        };
        return body.access_token;
    }
    async request(path, init = {}) {
        const token = await this.accessToken();
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('Content-Type', 'application/json');
        if (init.idempotencyKey) {
            headers.set('PayPal-Request-Id', init.idempotencyKey);
        }
        const res = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers,
            signal: AbortSignal.timeout(20_000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            this.logger.error(`PayPal ${path} failed: ${res.status} ${JSON.stringify(body)}`);
            throw new common_1.BadGatewayException(body?.message || body?.details?.[0]?.description || 'PayPal request failed');
        }
        return body;
    }
    async bookingForCustomer(bookingId, actor) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                tour: { select: { name: true } },
                payments: {
                    where: { provider: 'PAYPAL' },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (actor.role !== client_1.RoleType.ADMIN &&
            actor.role !== client_1.RoleType.OFFICE &&
            booking.customerUserId !== actor.id) {
            throw new common_1.UnauthorizedException('This booking does not belong to you');
        }
        if (booking.channel !== client_1.BookingProvider.WEBSITE) {
            throw new common_1.BadRequestException('PayPal is only available for website bookings');
        }
        if (booking.payLater) {
            throw new common_1.BadRequestException('This booking is set to pay later');
        }
        if (booking.payment === client_1.PaymentStatus.PAID) {
            throw new common_1.ConflictException('Booking is already paid');
        }
        if (!booking.totalAmount || Number(booking.totalAmount) <= 0) {
            throw new common_1.BadRequestException('Booking total is missing');
        }
        return booking;
    }
    providerAmount(bookingCurrency, amount) {
        if (bookingCurrency.toUpperCase() === this.currency) {
            return {
                value: Math.round(amount * 100) / 100,
                currency: this.currency,
                rate: 1,
            };
        }
        if (bookingCurrency.toUpperCase() === 'VND' && this.currency === 'USD') {
            const rate = this.vndPerUsd > 0 ? this.vndPerUsd : 25000;
            return {
                value: Math.round((amount / rate) * 100) / 100,
                currency: this.currency,
                rate,
            };
        }
        throw new common_1.BadRequestException(`Cannot convert ${bookingCurrency} to PayPal currency ${this.currency}`);
    }
    async createPayPalOrder(bookingId, actor) {
        this.assertConfigured();
        await this.expireStalePayPalPayments();
        const booking = await this.bookingForCustomer(bookingId, actor);
        const reusable = booking.payments.find((p) => p.status === client_1.PaymentRecordStatus.PENDING &&
            p.providerOrderId &&
            Date.now() - new Date(p.createdAt).getTime() < 3 * 60 * 60 * 1000);
        if (reusable?.providerOrderId) {
            return {
                orderId: reusable.providerOrderId,
                status: reusable.status,
                providerAmount: Number(reusable.providerAmount ?? 0),
                providerCurrency: reusable.providerCurrency,
                bookingTotal: Number(booking.totalAmount),
                bookingCurrency: booking.currency,
            };
        }
        const converted = this.providerAmount(booking.currency, Number(booking.totalAmount));
        if (converted.value < 0.01) {
            throw new common_1.BadRequestException('PayPal amount is too small');
        }
        const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
        const idempotencyKey = `booking-${booking.id}-${converted.value}-${bucket}`;
        const order = await this.request('/v2/checkout/orders', {
            method: 'POST',
            idempotencyKey,
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: booking.id,
                        custom_id: booking.bookingRef,
                        description: `${booking.tour?.name ?? 'Tour booking'} (${booking.bookingRef})`.slice(0, 127),
                        amount: {
                            currency_code: converted.currency,
                            value: converted.value.toFixed(2),
                        },
                    },
                ],
                application_context: {
                    brand_name: 'Hana Tourist',
                    user_action: 'PAY_NOW',
                    shipping_preference: 'NO_SHIPPING',
                },
            }),
        });
        if (!order?.id) {
            throw new common_1.BadGatewayException('PayPal did not return an order id');
        }
        const existing = await this.prisma.bookingPayment.findUnique({
            where: { providerOrderId: order.id },
        });
        if (existing) {
            return {
                orderId: order.id,
                status: existing.status,
                providerAmount: Number(existing.providerAmount ?? converted.value),
                providerCurrency: existing.providerCurrency,
                bookingTotal: Number(booking.totalAmount),
                bookingCurrency: booking.currency,
            };
        }
        try {
            await this.prisma.bookingPayment.create({
                data: {
                    bookingId: booking.id,
                    amount: new client_1.Prisma.Decimal(Number(booking.totalAmount)),
                    currency: booking.currency,
                    method: client_1.PaymentMethod.PAYPAL,
                    payerType: client_1.PayerType.CUSTOMER,
                    status: client_1.PaymentRecordStatus.PENDING,
                    provider: 'PAYPAL',
                    providerOrderId: order.id,
                    providerAmount: new client_1.Prisma.Decimal(converted.value),
                    providerCurrency: converted.currency,
                    exchangeRate: new client_1.Prisma.Decimal(converted.rate),
                    createdById: actor.id,
                    note: 'PayPal order created',
                    rawPayload: order,
                },
            });
        }
        catch (e) {
            if (e?.code !== 'P2002')
                throw e;
        }
        return {
            orderId: order.id,
            status: order.status,
            approveUrl: order.links?.find((l) => l.rel === 'approve')?.href ?? null,
            providerAmount: converted.value,
            providerCurrency: converted.currency,
            bookingTotal: Number(booking.totalAmount),
            bookingCurrency: booking.currency,
        };
    }
    captureDetails(order) {
        const unit = order?.purchase_units?.[0];
        const captures = unit?.payments?.captures;
        return Array.isArray(captures) && captures.length ? captures[0] : null;
    }
    async markCaptured(paymentId, capture, raw, note) {
        const payment = await this.prisma.bookingPayment.findUnique({
            where: { id: paymentId },
            include: { booking: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment record not found');
        if (payment.status === client_1.PaymentRecordStatus.PAID)
            return payment;
        const capturedValue = Number(capture.amount?.value ?? NaN);
        const capturedCurrency = String(capture.amount?.currency_code ?? '');
        const expectedValue = Number(payment.providerAmount ?? NaN);
        const expectedCurrency = String(payment.providerCurrency ?? '');
        if (!Number.isFinite(capturedValue) ||
            Math.abs(capturedValue - expectedValue) > 0.01 ||
            capturedCurrency !== expectedCurrency) {
            await this.prisma.bookingPayment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentRecordStatus.FAILED,
                    rawPayload: raw,
                    note: `Amount/currency mismatch: captured ${capturedValue} ${capturedCurrency}, expected ${expectedValue} ${expectedCurrency}`,
                },
            });
            throw new common_1.ConflictException('PayPal capture amount does not match the booking');
        }
        const captureId = capture.id ?? null;
        if (captureId) {
            const duplicate = await this.prisma.bookingPayment.findUnique({
                where: { providerCaptureId: captureId },
            });
            if (duplicate && duplicate.id !== payment.id)
                return duplicate;
        }
        const now = new Date();
        const [updated] = await this.prisma.$transaction([
            this.prisma.bookingPayment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentRecordStatus.PAID,
                    providerCaptureId: captureId,
                    paidAt: now,
                    rawPayload: raw,
                    ...(note ? { note } : {}),
                },
            }),
            this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    payment: client_1.PaymentStatus.PAID,
                    paymentMethod: client_1.PaymentMethod.PAYPAL,
                    paymentConfirmedAt: now,
                    paymentConfirmedByName: 'PayPal',
                    paymentNote: note ?? payment.booking.paymentNote,
                },
            }),
        ]);
        await this.audit.log({
            entityType: 'BookingPayment',
            entityId: payment.id,
            action: 'PAYPAL_CAPTURE',
            afterData: {
                status: client_1.PaymentRecordStatus.PAID,
                providerCaptureId: captureId,
                providerAmount: capturedValue,
                providerCurrency: capturedCurrency,
            },
            changedBy: null,
        });
        return updated;
    }
    async capturePayPalOrder(bookingId, orderId, actor, note) {
        this.assertConfigured();
        const booking = await this.bookingForCustomer(bookingId, actor);
        const payment = await this.prisma.bookingPayment.findFirst({
            where: {
                bookingId: booking.id,
                provider: 'PAYPAL',
                providerOrderId: orderId,
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('PayPal order does not belong to this booking');
        }
        if (payment.status === client_1.PaymentRecordStatus.PAID) {
            return { status: 'COMPLETED', alreadyCaptured: true, paymentId: payment.id };
        }
        let order;
        try {
            order = await this.request('/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', {
                method: 'POST',
                idempotencyKey: `capture-${orderId}`,
                body: '{}',
            });
        }
        catch {
            order = await this.request('/v2/checkout/orders/' + encodeURIComponent(orderId), {
                method: 'GET',
            });
        }
        const capture = this.captureDetails(order);
        if (!capture || capture.status !== 'COMPLETED' || order?.status !== 'COMPLETED') {
            throw new common_1.ConflictException('PayPal payment is not completed');
        }
        const updated = await this.markCaptured(payment.id, capture, order, note ?? 'Paid with PayPal');
        return {
            status: 'COMPLETED',
            paymentId: updated.id,
            orderId,
            captureId: capture.id ?? null,
        };
    }
    async recordOtaRemittance(bookingId, dto, actor) {
        const canManage = actor.role === client_1.RoleType.ADMIN ||
            (actor.role === client_1.RoleType.OFFICE &&
                !!actor.permissions?.includes('accounting.money.verify'));
        if (!canManage) {
            throw new common_1.UnauthorizedException('Only Accounting can record an OTA remittance');
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.channel === client_1.BookingProvider.WEBSITE ||
            booking.channel === client_1.BookingProvider.MANUAL) {
            throw new common_1.BadRequestException('Only OTA bookings use the remittance ledger');
        }
        const net = Number(dto.netAmount);
        const gross = dto.grossAmount != null ? Number(dto.grossAmount) : undefined;
        const commission = dto.commissionAmount != null
            ? Number(dto.commissionAmount)
            : gross != null
                ? Math.round((gross - net) * 100) / 100
                : undefined;
        if (!Number.isFinite(net) || net <= 0) {
            throw new common_1.BadRequestException('Net remittance amount is required');
        }
        if (gross != null && gross + 0.01 < net) {
            throw new common_1.BadRequestException('Gross amount cannot be less than net');
        }
        if (commission != null && commission < 0) {
            throw new common_1.BadRequestException('Commission cannot be negative');
        }
        const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
        if (Number.isNaN(paidAt.getTime())) {
            throw new common_1.BadRequestException('Invalid remittance date');
        }
        const payment = await this.prisma.bookingPayment.create({
            data: {
                bookingId: booking.id,
                amount: new client_1.Prisma.Decimal(net),
                currency: booking.currency,
                method: client_1.PaymentMethod.OTA,
                payerType: client_1.PayerType.OTA,
                status: client_1.PaymentRecordStatus.PAID,
                paidAt,
                grossAmount: gross != null ? new client_1.Prisma.Decimal(gross) : undefined,
                commissionAmount: commission != null
                    ? new client_1.Prisma.Decimal(commission)
                    : undefined,
                confirmedById: actor.id,
                confirmedByName: actor.name ?? actor.email ?? null,
                createdById: actor.id,
                note: [
                    booking.channel,
                    dto.reference ? `ref ${dto.reference}` : null,
                    dto.note ?? null,
                ]
                    .filter(Boolean)
                    .join(' · '),
            },
        });
        await this.audit.log({
            entityType: 'BookingPayment',
            entityId: payment.id,
            action: 'OTA_REMITTANCE',
            afterData: {
                bookingId: booking.id,
                netAmount: net,
                grossAmount: gross ?? null,
                commissionAmount: commission ?? null,
                paidAt: paidAt.toISOString(),
                reference: dto.reference ?? null,
            },
            changedBy: actor.id,
        });
        return payment;
    }
    async verifyWebhook(headers, rawBody, event) {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
        if (!webhookId) {
            this.logger.error('PAYPAL_WEBHOOK_ID is not configured');
            throw new common_1.ServiceUnavailableException('PayPal webhook is not configured');
        }
        this.assertConfigured();
        const header = (name) => {
            const value = headers[name.toLowerCase()];
            return Array.isArray(value) ? value[0] : value;
        };
        const transmissionId = header('paypal-transmission-id');
        const transmissionTime = header('paypal-transmission-time');
        const certUrl = header('paypal-cert-url');
        const authAlgo = header('paypal-auth-algo');
        const transmissionSig = header('paypal-transmission-sig');
        if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
            throw new common_1.UnauthorizedException('Missing PayPal webhook signature headers');
        }
        const verification = await this.request('/v1/notifications/verify-webhook-signature', {
            method: 'POST',
            body: JSON.stringify({
                auth_algo: authAlgo,
                cert_url: certUrl,
                transmission_id: transmissionId,
                transmission_sig: transmissionSig,
                transmission_time: transmissionTime,
                webhook_id: webhookId,
                webhook_event: event,
            }),
        });
        if (verification.verification_status !== 'SUCCESS') {
            this.logger.warn(`PayPal webhook signature rejected: ${rawBody.slice(0, 200)}`);
            throw new common_1.UnauthorizedException('Invalid PayPal webhook signature');
        }
        return this.handleWebhookEvent(event);
    }
    async handleWebhookEvent(event) {
        const type = String(event?.event_type ?? '');
        const resource = event?.resource ?? {};
        const related = resource?.supplementary_data?.related_ids ?? {};
        const orderId = related?.order_id ?? null;
        const captureId = related?.capture_id ??
            (type === "PAYMENT.CAPTURE.REFUNDED" ? null : (resource?.id ?? null));
        const payment = await this.prisma.bookingPayment.findFirst({
            where: orderId
                ? { provider: 'PAYPAL', providerOrderId: orderId }
                : captureId
                    ? { provider: 'PAYPAL', providerCaptureId: captureId }
                    : { id: '__never__' },
        });
        if (!payment)
            return { received: true, ignored: true };
        if (type === 'PAYMENT.CAPTURE.COMPLETED') {
            const capture = {
                id: captureId ?? undefined,
                status: resource?.status,
                amount: resource?.amount,
            };
            if (capture.status === 'COMPLETED') {
                await this.markCaptured(payment.id, capture, event, 'Paid with PayPal (webhook)');
            }
        }
        else if (type === 'PAYMENT.CAPTURE.REVERSED') {
            await this.prisma.bookingPayment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentRecordStatus.REFUNDED,
                    rawPayload: event,
                    note: 'PayPal capture reversed',
                },
            });
            await this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: { payment: client_1.PaymentStatus.REFUNDED },
            });
        }
        else if (type === 'PAYMENT.CAPTURE.DENIED') {
            await this.prisma.bookingPayment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentRecordStatus.FAILED,
                    rawPayload: event,
                    note: 'PayPal capture denied',
                },
            });
        }
        else if (type === 'PAYMENT.CAPTURE.REFUNDED') {
            await this.prisma.bookingPayment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentRecordStatus.REFUNDED,
                    rawPayload: event,
                    note: 'PayPal capture refunded',
                },
            });
            await this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: { payment: client_1.PaymentStatus.REFUNDED },
            });
        }
        return { received: true };
    }
};
exports.PaymentService = PaymentService;
__decorate([
    (0, schedule_1.Interval)(30 * 60 * 1000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentService.prototype, "expireStalePayPalPaymentsJob", null);
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map