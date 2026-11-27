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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = __importDefault(require("nodemailer"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const booking_confirmation_template_1 = require("./booking-confirmation.template");
const dispatch_readiness_template_1 = require("./dispatch-readiness.template");
const pickup_reminder_template_1 = require("./pickup-reminder.template");
const transport_alert_template_1 = require("./transport-alert.template");
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const REMINDER_CHANNELS = [
    client_1.BookingProvider.WEBSITE,
    client_1.BookingProvider.MANUAL,
];
function envFlag(name, defaultValue) {
    const raw = process.env[name];
    if (raw == null || raw.trim() === '')
        return defaultValue;
    return raw.trim().toLowerCase() === 'true';
}
function stripHeader(value) {
    return value
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, 200);
}
let MailService = MailService_1 = class MailService {
    prisma;
    logger = new common_1.Logger(MailService_1.name);
    transporter = null;
    transporterKey = '';
    sendingReminders = new Set();
    constructor(prisma) {
        this.prisma = prisma;
    }
    isEnabled() {
        return envFlag('TEMPLATE_MAIL_ENABLED', false);
    }
    settings() {
        const host = (process.env.TEMPLATE_MAIL_HOST ?? '').trim();
        const portRaw = Number(process.env.TEMPLATE_MAIL_PORT ?? 587);
        const user = (process.env.TEMPLATE_MAIL_USER ?? '').trim();
        const pass = process.env.TEMPLATE_MAIL_PASSWORD ?? '';
        return {
            host,
            port: Number.isFinite(portRaw) && portRaw > 0 ? portRaw : 587,
            secure: envFlag('TEMPLATE_MAIL_SECURE', false),
            requireTls: envFlag('TEMPLATE_MAIL_REQUIRE_TLS', true),
            rejectUnauthorized: envFlag('TEMPLATE_MAIL_TLS_REJECT_UNAUTHORIZED', true),
            user,
            pass,
            from: (process.env.TEMPLATE_MAIL_FROM ?? '').trim() || user,
            fromName: (process.env.TEMPLATE_MAIL_FROM_NAME ?? '').trim() || 'Hana Tourist',
            replyTo: (process.env.TEMPLATE_MAIL_REPLY_TO ?? '').trim(),
        };
    }
    isConfigured() {
        if (!this.isEnabled())
            return false;
        const s = this.settings();
        if (!s.host || !s.from || !EMAIL_RE.test(s.from))
            return false;
        if (s.user && !s.pass)
            return false;
        return true;
    }
    getTransporter() {
        const s = this.settings();
        const key = JSON.stringify([
            s.host,
            s.port,
            s.secure,
            s.requireTls,
            s.rejectUnauthorized,
            s.user,
            s.pass,
            s.from,
        ]);
        if (this.transporter && this.transporterKey === key)
            return this.transporter;
        this.transporter = nodemailer_1.default.createTransport({
            host: s.host,
            port: s.port,
            secure: s.secure,
            requireTLS: !s.secure && s.requireTls,
            auth: s.user ? { user: s.user, pass: s.pass } : undefined,
            tls: { rejectUnauthorized: s.rejectUnauthorized },
            connectionTimeout: 15_000,
            greetingTimeout: 15_000,
            socketTimeout: 30_000,
        });
        this.transporterKey = key;
        return this.transporter;
    }
    async company() {
        return this.prisma.companyProfile
            .findFirst({
            select: {
                name: true,
                address: true,
                phone: true,
                email: true,
                website: true,
            },
        })
            .catch(() => null);
    }
    async deliver(input) {
        const s = this.settings();
        const info = (await this.getTransporter().sendMail({
            from: { name: s.fromName, address: s.from },
            to: input.to,
            replyTo: s.replyTo && EMAIL_RE.test(s.replyTo) ? s.replyTo : undefined,
            subject: stripHeader(input.subject),
            text: input.text,
            html: input.html,
            headers: {
                'X-Booking-Ref': stripHeader(input.bookingRef),
                'Auto-Submitted': 'auto-generated',
            },
        }));
        return info.messageId;
    }
    async sendBookingConfirmation(bookingId) {
        try {
            if (!this.isEnabled())
                return { sent: false, reason: 'DISABLED' };
            if (!this.isConfigured()) {
                this.logger.warn('Booking confirmation mail is enabled but TEMPLATE_MAIL_HOST/FROM are not configured');
                return { sent: false, reason: 'NOT_CONFIGURED' };
            }
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    tour: { select: { name: true, durationDays: true } },
                    assignment: { select: { status: true } },
                },
            });
            if (!booking)
                return { sent: false, reason: 'BOOKING_NOT_FOUND' };
            if (booking.lateBooking &&
                (!booking.assignment ||
                    booking.assignment.status === client_1.AssignmentStatus.WAITING_LIST)) {
                return { sent: false, reason: 'WAITING_LIST' };
            }
            if (booking.channel !== client_1.BookingProvider.WEBSITE &&
                booking.channel !== client_1.BookingProvider.MANUAL) {
                return { sent: false, reason: 'NOT_WEBSITE_OR_MANUAL' };
            }
            if (booking.parentBookingId) {
                return { sent: false, reason: 'GROUP_CHILD' };
            }
            const to = (booking.mail ?? '').trim();
            if (!EMAIL_RE.test(to)) {
                this.logger.warn(`Cannot send confirmation for ${booking.bookingRef}: no valid customer email`);
                return { sent: false, reason: 'NO_RECIPIENT' };
            }
            if (booking.confirmationEmailSentAt) {
                return { sent: false, reason: 'ALREADY_SENT' };
            }
            const claimedAt = new Date();
            const claim = await this.prisma.booking.updateMany({
                where: { id: booking.id, confirmationEmailSentAt: null },
                data: { confirmationEmailSentAt: claimedAt },
            });
            if (claim.count === 0) {
                return { sent: false, reason: 'ALREADY_SENT' };
            }
            try {
                const company = await this.company();
                const rendered = (0, booking_confirmation_template_1.renderBookingConfirmation)({
                    bookingRef: booking.bookingRef,
                    customerName: booking.customerName,
                    phone: booking.phone,
                    mail: booking.mail,
                    startingDate: booking.startingDate,
                    departureTime: booking.departureTime,
                    totalPax: booking.totalPax,
                    paxDetail: booking.paxDetail,
                    totalAmount: booking.totalAmount?.toString() ?? null,
                    currency: booking.currency,
                    paymentStatus: booking.payment,
                    paymentMethod: booking.paymentMethod,
                    payLater: booking.payLater,
                    hotelName: booking.hotelName,
                    address: booking.address,
                    notes: booking.notes,
                    tourName: booking.tour?.name ?? booking.tourName,
                    durationDays: booking.tour?.durationDays,
                }, company);
                const messageId = await this.deliver({
                    to,
                    subject: rendered.subject,
                    text: rendered.text,
                    html: rendered.html,
                    bookingRef: booking.bookingRef,
                });
                this.logger.log(`Booking confirmation sent for ${booking.bookingRef} to ${to} (${messageId})`);
                return { sent: true };
            }
            catch (error) {
                await this.prisma.booking
                    .updateMany({
                    where: { id: booking.id, confirmationEmailSentAt: claimedAt },
                    data: { confirmationEmailSentAt: null },
                })
                    .catch(() => undefined);
                this.logger.error(`Failed to send booking confirmation for ${booking.bookingRef}: ${error.message}`);
                return { sent: false, reason: 'SEND_FAILED' };
            }
        }
        catch (error) {
            this.logger.error(`Booking confirmation pipeline failed for ${bookingId}: ${error.message}`);
            return { sent: false, reason: 'FAILED' };
        }
    }
    async sendTransportAlert(input) {
        if (!this.isEnabled())
            return { sent: 0, reason: 'DISABLED' };
        if (!this.isConfigured()) {
            this.logger.warn('Transport alert mail is enabled but TEMPLATE_MAIL_HOST/FROM are not configured');
            return { sent: 0, reason: 'NOT_CONFIGURED' };
        }
        const recipients = [
            ...new Set((input.to ?? [])
                .map((value) => (value ?? '').trim())
                .filter((value) => EMAIL_RE.test(value))),
        ];
        if (recipients.length === 0)
            return { sent: 0, reason: 'NO_RECIPIENT' };
        try {
            const company = await this.company();
            const rendered = (0, transport_alert_template_1.renderTransportAlert)({
                title: input.title,
                message: input.message,
                note: input.note,
                reference: input.reference,
                actionLabel: input.actionLabel,
                actionUrl: input.actionUrl,
                company,
            });
            let sent = 0;
            for (const to of recipients) {
                try {
                    await this.deliver({
                        to,
                        subject: rendered.subject,
                        text: rendered.text,
                        html: rendered.html,
                        bookingRef: input.reference ?? 'TRANSPORT-ALERT',
                    });
                    sent++;
                }
                catch (error) {
                    this.logger.error(`Failed to send transport alert to ${to}: ${error.message}`);
                }
            }
            return { sent };
        }
        catch (error) {
            this.logger.error(`Transport alert pipeline failed: ${error.message}`);
            return { sent: 0, reason: 'FAILED' };
        }
    }
    async sendDispatchReadiness(input) {
        if (!this.isEnabled())
            return { sent: 0, reason: 'DISABLED' };
        if (!this.isConfigured()) {
            this.logger.warn('Dispatch readiness mail is enabled but TEMPLATE_MAIL_HOST/FROM are not configured');
            return { sent: 0, reason: 'NOT_CONFIGURED' };
        }
        const recipients = [
            ...new Set((input.to ?? [])
                .map((value) => (value ?? '').trim())
                .filter((value) => EMAIL_RE.test(value))),
        ];
        if (recipients.length === 0)
            return { sent: 0, reason: 'NO_RECIPIENT' };
        try {
            const company = await this.company();
            const rendered = (0, dispatch_readiness_template_1.renderDispatchReadiness)({
                dateKey: input.dateKey,
                dateLabel: input.dateLabel,
                rows: input.rows,
                actionLabel: 'Open dispatch board',
                actionUrl: input.actionUrl,
                company,
            });
            let sent = 0;
            for (const to of recipients) {
                try {
                    await this.deliver({
                        to,
                        subject: rendered.subject,
                        text: rendered.text,
                        html: rendered.html,
                        bookingRef: `DISPATCH-${input.dateKey}`,
                    });
                    sent++;
                }
                catch (error) {
                    this.logger.error(`Failed to send dispatch readiness mail to ${to}: ${error.message}`);
                }
            }
            return { sent };
        }
        catch (error) {
            this.logger.error(`Dispatch readiness mail pipeline failed: ${error.message}`);
            return { sent: 0, reason: 'FAILED' };
        }
    }
    async sendPickupReminders(assignmentId, options = {}) {
        const empty = {
            sent: 0,
            failed: 0,
            skipped: 0,
            eligible: 0,
        };
        try {
            if (!this.isEnabled())
                return { ...empty, reason: 'DISABLED' };
            if (!this.isConfigured()) {
                this.logger.warn('Pickup reminder is enabled but TEMPLATE_MAIL_HOST/FROM are not configured');
                return { ...empty, reason: 'NOT_CONFIGURED' };
            }
            const assignment = await this.prisma.assignment.findUnique({
                where: { id: assignmentId },
                select: {
                    id: true,
                    code: true,
                    tourName: true,
                    startDate: true,
                    status: true,
                    guide: { select: { name: true, email: true } },
                    driver: { select: { name: true, email: true } },
                    vehicle: { select: { plateNumber: true } },
                    bookings: {
                        where: {
                            parentBookingId: null,
                            status: { not: client_1.BookingStatus.CANCELED },
                        },
                        select: {
                            id: true,
                            bookingRef: true,
                            customerName: true,
                            mail: true,
                            channel: true,
                            hotelName: true,
                            address: true,
                            departureTime: true,
                            startingDate: true,
                            totalPax: true,
                            paxDetail: true,
                            pickupReminderSentAt: true,
                            tour: {
                                select: {
                                    name: true,
                                    durationDays: true,
                                    departureTimes: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!assignment)
                return { ...empty, reason: 'ASSIGNMENT_NOT_FOUND' };
            if (assignment.status === client_1.AssignmentStatus.COMPLETED ||
                assignment.status === client_1.AssignmentStatus.CANCELED) {
                return { ...empty, reason: 'ASSIGNMENT_CLOSED' };
            }
            const company = await this.company();
            let sent = 0;
            let failed = 0;
            let skipped = 0;
            let eligible = 0;
            for (const booking of assignment.bookings) {
                if (!REMINDER_CHANNELS.includes(booking.channel)) {
                    skipped++;
                    continue;
                }
                const to = (booking.mail ?? '').trim();
                if (!EMAIL_RE.test(to)) {
                    skipped++;
                    continue;
                }
                eligible++;
                if (booking.pickupReminderSentAt && !options.force) {
                    skipped++;
                    continue;
                }
                if (this.sendingReminders.has(booking.id)) {
                    skipped++;
                    continue;
                }
                const claimedAt = new Date();
                if (!options.force) {
                    const claim = await this.prisma.booking.updateMany({
                        where: { id: booking.id, pickupReminderSentAt: null },
                        data: { pickupReminderSentAt: claimedAt },
                    });
                    if (claim.count === 0) {
                        skipped++;
                        continue;
                    }
                }
                this.sendingReminders.add(booking.id);
                try {
                    const pickupTime = booking.departureTime?.trim() ||
                        booking.tour?.departureTimes?.[0]?.trim() ||
                        null;
                    const rendered = (0, pickup_reminder_template_1.renderPickupReminder)({
                        bookingRef: booking.bookingRef,
                        customerName: booking.customerName,
                        tourName: booking.tour?.name ?? assignment.tourName,
                        startingDate: booking.startingDate ?? assignment.startDate,
                        pickupTime,
                        hotelName: booking.hotelName,
                        address: booking.address,
                        totalPax: booking.totalPax,
                        paxDetail: booking.paxDetail,
                        guide: assignment.guide,
                        driver: assignment.driver,
                        vehiclePlate: assignment.vehicle?.plateNumber,
                        durationDays: booking.tour?.durationDays,
                        company,
                    });
                    const messageId = await this.deliver({
                        to,
                        subject: rendered.subject,
                        text: rendered.text,
                        html: rendered.html,
                        bookingRef: booking.bookingRef,
                    });
                    await this.prisma.booking
                        .update({
                        where: { id: booking.id },
                        data: { pickupReminderSentAt: new Date() },
                    })
                        .catch(() => undefined);
                    sent++;
                    this.logger.log(`Pickup reminder sent for ${booking.bookingRef} (${assignment.tourName ?? assignment.code ?? assignment.id}) to ${to} (${messageId})`);
                }
                catch (error) {
                    if (!options.force) {
                        await this.prisma.booking
                            .updateMany({
                            where: { id: booking.id, pickupReminderSentAt: claimedAt },
                            data: { pickupReminderSentAt: null },
                        })
                            .catch(() => undefined);
                    }
                    failed++;
                    this.logger.error(`Failed to send pickup reminder for ${booking.bookingRef}: ${error.message}`);
                }
                finally {
                    this.sendingReminders.delete(booking.id);
                }
            }
            if (sent > 0) {
                await this.prisma.assignment
                    .update({
                    where: { id: assignment.id },
                    data: { pickupReminderLastSentAt: new Date() },
                })
                    .catch(() => undefined);
            }
            return { sent, failed, skipped, eligible };
        }
        catch (error) {
            this.logger.error(`Pickup reminder pipeline failed for ${assignmentId}: ${error.message}`);
            return { ...empty, reason: 'FAILED' };
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MailService);
//# sourceMappingURL=mail.service.js.map