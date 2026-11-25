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
var DispatchReadinessCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchReadinessCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const dispatch_readiness_template_1 = require("../mail/dispatch-readiness.template");
const dispatch_policy_service_1 = require("../dispatch-policy/dispatch-policy.service");
const mail_format_util_1 = require("../mail/mail-format.util");
const unpaid_booking_util_1 = require("../common/utils/unpaid-booking.util");
const notification_service_1 = require("../notifications/notification.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const HCM_TIMEZONE = 'Asia/Ho_Chi_Minh';
let DispatchReadinessCron = DispatchReadinessCron_1 = class DispatchReadinessCron {
    prisma;
    mail;
    dispatchPolicy;
    notifications;
    gateway;
    logger = new common_1.Logger(DispatchReadinessCron_1.name);
    running = false;
    constructor(prisma, mail, dispatchPolicy, notifications, gateway) {
        this.prisma = prisma;
        this.mail = mail;
        this.dispatchPolicy = dispatchPolicy;
        this.notifications = notifications;
        this.gateway = gateway;
    }
    async scheduled() {
        if (this.running)
            return;
        this.running = true;
        try {
            const result = await this.sendTomorrowReport();
            this.logger.log(`20:00 dispatch readiness check: buses=${result.buses}, issues=${result.issues}, mail=${result.sent}, in-app=${result.notified}${result.reason ? `, reason=${result.reason}` : ''}`);
        }
        catch (error) {
            this.logger.error(`20:00 dispatch readiness check failed: ${error.message}`, error.stack);
        }
        finally {
            this.running = false;
        }
    }
    async sendTomorrowReport() {
        const tomorrow = this.dispatchPolicy.addDays(this.dispatchPolicy.todayHcm().start, 1);
        const dateKey = this.dispatchPolicy.dayKey(tomorrow);
        const range = this.dispatchPolicy.dayRange(tomorrow);
        const assignments = await this.prisma.assignment.findMany({
            where: {
                startDate: { gte: range.start, lte: range.end },
                status: {
                    in: [
                        client_1.AssignmentStatus.WAITING_LIST,
                        client_1.AssignmentStatus.DRAFT_ASSIGNED,
                        client_1.AssignmentStatus.PENDING,
                        client_1.AssignmentStatus.TRANSFERRED,
                    ],
                },
                executionMode: { not: client_1.AssignmentExecutionMode.OUTSOURCED_PARTNER },
            },
            select: {
                id: true,
                code: true,
                tourName: true,
                startDate: true,
                totalPax: true,
                status: true,
                executionMode: true,
                guideConfirmedAt: true,
                guideDeclinedAt: true,
                providerRequestStatus: true,
                providerDeadline: true,
                guide: {
                    select: {
                        name: true,
                        email: true,
                        guideProfile: { select: { type: true } },
                    },
                },
                driver: { select: { name: true, email: true } },
                vehicle: { select: { plateNumber: true } },
                provider: { select: { name: true, isCompany: true } },
                bookings: {
                    where: { status: { not: client_1.BookingStatus.CANCELED } },
                    select: {
                        bookingRef: true,
                        channel: true,
                        status: true,
                        payment: true,
                        paymentMethod: true,
                        payLater: true,
                    },
                },
            },
            orderBy: [{ startDate: 'asc' }, { code: 'asc' }],
        });
        const now = Date.now();
        const rows = assignments.map((assignment) => {
            const issues = [];
            const waiting = assignment.status === client_1.AssignmentStatus.WAITING_LIST;
            const driverOnly = assignment.executionMode ===
                client_1.AssignmentExecutionMode.COMPANY_DRIVER_ONLY;
            const externalProvider = assignment.provider?.isCompany === false;
            const freelance = !!assignment.guide &&
                (assignment.guide.guideProfile?.type ?? client_1.GuideType.FREELANCE) ===
                    client_1.GuideType.FREELANCE;
            const unpaid = assignment.bookings.filter((booking) => (0, unpaid_booking_util_1.isUnpaidPayPalBooking)(booking));
            if (waiting)
                issues.push('Waiting list — place after 05:00');
            if (unpaid.length > 0) {
                const refs = unpaid
                    .map((booking) => booking.bookingRef)
                    .filter(Boolean)
                    .join(', ');
                issues.push(`Unpaid PayPal booking${unpaid.length > 1 ? 's' : ''}${refs ? ` (${refs})` : ''} — cannot dispatch`);
            }
            if (!waiting) {
                if (!driverOnly) {
                    if (!assignment.guide) {
                        issues.push('No guide assigned');
                    }
                    else if (assignment.guideDeclinedAt) {
                        issues.push('Guide declined the assignment');
                    }
                    else if (freelance && !assignment.guideConfirmedAt) {
                        issues.push('Freelance guide has not confirmed yet');
                    }
                }
                if (externalProvider) {
                    switch (assignment.providerRequestStatus) {
                        case client_1.TransportRequestStatus.NOT_REQUIRED:
                            issues.push('Provider request not sent');
                            break;
                        case client_1.TransportRequestStatus.DECLINED:
                            issues.push('Provider declined the request');
                            break;
                        case client_1.TransportRequestStatus.EXPIRED:
                            issues.push('Provider request expired');
                            break;
                        case client_1.TransportRequestStatus.CANCELLED:
                            issues.push('Provider request cancelled');
                            break;
                        case client_1.TransportRequestStatus.ASSIGNED:
                            if (!assignment.driver)
                                issues.push('Provider assigned — no driver');
                            else if (!assignment.vehicle)
                                issues.push('Provider assigned — no vehicle');
                            break;
                        default:
                            if (assignment.providerDeadline &&
                                assignment.providerDeadline.getTime() < now) {
                                issues.push('Provider deadline passed');
                            }
                            else if (!assignment.driver) {
                                issues.push('Driver pending from provider');
                            }
                            break;
                    }
                }
                else if (!assignment.driver) {
                    issues.push('No driver assigned');
                }
            }
            const guideLabel = !assignment.guide
                ? '-'
                : [
                    assignment.guide.name || assignment.guide.email || 'Guide',
                    freelance ? 'freelance' : 'company',
                    assignment.guideDeclinedAt
                        ? 'declined'
                        : assignment.guideConfirmedAt
                            ? 'confirmed'
                            : freelance
                                ? 'awaiting confirmation'
                                : null,
                ]
                    .filter(Boolean)
                    .join(' · ');
            return {
                bus: assignment.code || assignment.id,
                tour: assignment.tourName || '-',
                departure: (0, dispatch_readiness_template_1.dispatchReadinessDeparture)(assignment.startDate),
                pax: assignment.totalPax ?? 0,
                guide: guideLabel,
                driver: assignment.driver?.name || assignment.driver?.email || '-',
                vehicle: assignment.vehicle?.plateNumber || '-',
                provider: assignment.provider?.name || '-',
                issues,
            };
        });
        rows.sort((left, right) => {
            const leftNeeds = left.issues.length > 0 ? 0 : 1;
            const rightNeeds = right.issues.length > 0 ? 0 : 1;
            return leftNeeds - rightNeeds;
        });
        const issueCount = rows.filter((row) => row.issues.length > 0).length;
        if (issueCount === 0) {
            return {
                sent: 0,
                notified: 0,
                buses: rows.length,
                issues: 0,
                reason: 'NO_ISSUES',
            };
        }
        const admins = await this.prisma.user.findMany({
            where: {
                role: { in: [client_1.RoleType.ADMIN, client_1.RoleType.OFFICE] },
                isActive: true,
            },
            select: { id: true, email: true },
        });
        const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
        const result = await this.mail.sendDispatchReadiness({
            to: admins.map((user) => user.email),
            dateKey,
            dateLabel: (0, mail_format_util_1.formatMailDate)(tomorrow),
            rows,
            actionUrl: `${frontend}/bookings?tab=assignments`,
        });
        const summary = `${issueCount} of ${rows.length} bus(es) for ${(0, mail_format_util_1.formatMailDate)(tomorrow)} still need attention before the dispatch cutoff.`;
        for (const admin of admins) {
            const notification = await this.notifications.create(admin.id, client_1.NotificationType.GENERAL, 'Dispatch readiness — empty places remain', summary, {
                kind: 'DISPATCH_READINESS',
                date: dateKey,
                buses: rows.length,
                issues: issueCount,
                url: '/bookings?tab=assignments',
            });
            this.gateway.notifyUser(admin.id, 'notification', notification);
        }
        return {
            sent: result.sent,
            notified: admins.length,
            buses: rows.length,
            issues: issueCount,
            reason: result.reason,
        };
    }
};
exports.DispatchReadinessCron = DispatchReadinessCron;
__decorate([
    (0, schedule_1.Cron)('0 20 * * *', { timeZone: HCM_TIMEZONE }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DispatchReadinessCron.prototype, "scheduled", null);
exports.DispatchReadinessCron = DispatchReadinessCron = DispatchReadinessCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        dispatch_policy_service_1.DispatchPolicyService,
        notification_service_1.NotificationService,
        notifications_gateway_1.NotificationsGateway])
], DispatchReadinessCron);
//# sourceMappingURL=dispatch-readiness.cron.js.map