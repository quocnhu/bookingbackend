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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    buildBuckets(range) {
        const now = new Date();
        const buckets = [];
        if (range === 'day') {
            for (let h = 23; h >= 0; h--) {
                const start = new Date(now);
                start.setHours(now.getHours() - h, 0, 0, 0);
                const end = new Date(start);
                end.setHours(start.getHours() + 1);
                buckets.push({ label: `${start.getHours()}:00`, start: start.getTime(), end: end.getTime() });
            }
        }
        else {
            const days = range === 'week' ? 7 : 30;
            for (let d = days - 1; d >= 0; d--) {
                const start = new Date(now);
                start.setDate(now.getDate() - d);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(start.getDate() + 1);
                const label = `${start.getDate()}/${start.getMonth() + 1}`;
                buckets.push({ label, start: start.getTime(), end: end.getTime() });
            }
        }
        return buckets;
    }
    bucketIndex(list, time) {
        for (let i = 0; i < list.length; i++) {
            if (time >= list[i].start && time < list[i].end)
                return i;
        }
        return -1;
    }
    async stats(fromDate, toDate) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const hasRange = Boolean(fromDate && toDate);
        const revenueFrom = hasRange ? new Date(`${fromDate}T00:00:00`) : null;
        const revenueTo = hasRange ? new Date(`${toDate}T23:59:59.999`) : null;
        if (hasRange &&
            (Number.isNaN(revenueFrom.getTime()) ||
                Number.isNaN(revenueTo.getTime()))) {
            throw new common_1.BadRequestException('Invalid revenue date range');
        }
        const paymentWhere = hasRange
            ? {
                status: client_1.PaymentRecordStatus.PAID,
                paidAt: { gte: revenueFrom, lte: revenueTo },
            }
            : { status: client_1.PaymentRecordStatus.PAID };
        const pendingValueWhere = hasRange
            ? {
                payment: client_1.PaymentStatus.PENDING,
                createdAt: { gte: revenueFrom, lte: revenueTo },
            }
            : { payment: client_1.PaymentStatus.PENDING };
        const moneyLockedWhere = hasRange
            ? { gte: revenueFrom, lte: revenueTo }
            : { not: null };
        const [totalBookings, todayBookings, pendingBookings, todayDispatched, totalTours, totalUsers, totalRoles, totalPermissions, totalAssignments, todayLogins, lockedAccounts, collectedAgg, collectedTodayAgg, pendingValueAgg, localUsers, googleUsers, customerUsers, googleCustomers, settledToCompanyAgg, settledToGuideAgg,] = await Promise.all([
            this.prisma.booking.count(),
            this.prisma.booking.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
            this.prisma.booking.count({ where: { status: client_1.BookingStatus.PENDING } }),
            this.prisma.assignment.count({
                where: {
                    status: {
                        in: [
                            client_1.AssignmentStatus.DISPATCHED,
                            client_1.AssignmentStatus.VERIFYING,
                            client_1.AssignmentStatus.COMPLETED,
                        ],
                    },
                    startDate: { gte: todayStart, lte: todayEnd },
                },
            }),
            this.prisma.tour.count(),
            this.prisma.user.count(),
            this.prisma.role.count(),
            this.prisma.permission.count(),
            this.prisma.assignment.count(),
            this.prisma.userSession.count({ where: { loggedInAt: { gte: todayStart, lte: todayEnd } } }),
            this.prisma.user.count({ where: { lockoutUntil: { gt: new Date() } } }),
            this.prisma.bookingPayment.aggregate({
                where: paymentWhere,
                _sum: { amount: true },
            }),
            this.prisma.bookingPayment.aggregate({
                where: {
                    status: client_1.PaymentRecordStatus.PAID,
                    paidAt: { gte: todayStart, lte: todayEnd },
                },
                _sum: { amount: true },
            }),
            this.prisma.booking.aggregate({
                where: pendingValueWhere,
                _sum: { totalAmount: true },
            }),
            this.prisma.user.count({ where: { authProvider: client_1.AuthProvider.LOCAL } }),
            this.prisma.user.count({ where: { authProvider: client_1.AuthProvider.GOOGLE } }),
            this.prisma.user.count({ where: { role: client_1.RoleType.CUSTOMER } }),
            this.prisma.user.count({
                where: {
                    role: client_1.RoleType.CUSTOMER,
                    authProvider: client_1.AuthProvider.GOOGLE,
                },
            }),
            this.prisma.tourReport.aggregate({
                where: {
                    moneyVerifiedAt: moneyLockedWhere,
                    settlementFlow: client_1.FeeFlowType.COLLECT_MONEY,
                    moneyPayeeType: {
                        in: [client_1.MoneyPayeeType.GUIDE, client_1.MoneyPayeeType.DRIVER],
                    },
                },
                _sum: { netAmount: true },
            }),
            this.prisma.tourReport.aggregate({
                where: {
                    moneyVerifiedAt: moneyLockedWhere,
                    settlementFlow: client_1.FeeFlowType.PAY_MONEY,
                    moneyPayeeType: {
                        in: [client_1.MoneyPayeeType.GUIDE, client_1.MoneyPayeeType.DRIVER],
                    },
                },
                _sum: { netAmount: true },
            }),
        ]);
        return {
            totalBookings,
            todayBookings,
            pendingBookings,
            todayDispatched,
            totalTours,
            totalUsers,
            totalRoles,
            totalPermissions,
            totalAssignments,
            todayLogins,
            lockedAccounts,
            totalRevenue: Number(collectedAgg._sum.amount ?? 0),
            revenueToday: Number(collectedTodayAgg._sum.amount ?? 0),
            pendingRevenue: Number(pendingValueAgg._sum.totalAmount ?? 0),
            localUsers,
            googleUsers,
            customerUsers,
            googleCustomers,
            settledToCompany: Number(settledToCompanyAgg._sum.netAmount ?? 0),
            settledToGuide: Math.abs(Number(settledToGuideAgg._sum.netAmount ?? 0)),
            revenueFrom: fromDate ?? null,
            revenueTo: toDate ?? null,
        };
    }
    async charts(range) {
        const buckets = this.buildBuckets(range);
        const startTime = buckets[0].start;
        const endTime = buckets[buckets.length - 1].end;
        const [bookings, sessions, auditLogs, payments] = await Promise.all([
            this.prisma.booking.findMany({
                where: { createdAt: { gte: new Date(startTime), lte: new Date(endTime) } },
                select: { createdAt: true, payment: true, status: true },
            }),
            this.prisma.userSession.findMany({
                where: { loggedInAt: { gte: new Date(startTime), lte: new Date(endTime) } },
                select: { loggedInAt: true },
            }),
            this.prisma.auditLog.findMany({
                where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
                select: { action: true },
            }),
            this.prisma.bookingPayment.findMany({
                where: {
                    status: client_1.PaymentRecordStatus.PAID,
                    paidAt: { gte: new Date(startTime), lte: new Date(endTime) },
                },
                select: { amount: true, paidAt: true },
            }),
        ]);
        const bookingsByBucket = buckets.map((b) => ({
            label: b.label,
            count: bookings.filter((x) => this.bucketIndex(buckets, x.createdAt.getTime()) === buckets.indexOf(b)).length,
        }));
        const loginsByBucket = buckets.map((b) => ({
            label: b.label,
            count: sessions.filter((x) => this.bucketIndex(buckets, x.loggedInAt.getTime()) === buckets.indexOf(b)).length,
        }));
        const revenueByBucket = buckets.map((b, i) => ({
            label: b.label,
            amount: payments
                .filter((p) => p.paidAt && this.bucketIndex(buckets, p.paidAt.getTime()) === i)
                .reduce((sum, p) => sum + Number(p.amount), 0),
        }));
        const paymentStatusDistribution = [client_1.PaymentStatus.PAID, client_1.PaymentStatus.PENDING, client_1.PaymentStatus.REFUNDED].map((status) => ({
            status,
            value: bookings.filter((b) => b.payment === status).length,
        }));
        const bookingStatusDistribution = [client_1.BookingStatus.PENDING, client_1.BookingStatus.ASSIGNED, client_1.BookingStatus.CANCELED].map((status) => ({
            status,
            value: bookings.filter((b) => b.status === status).length,
        }));
        const actionCounts = new Map();
        for (const log of auditLogs) {
            actionCounts.set(log.action, (actionCounts.get(log.action) ?? 0) + 1);
        }
        const activityByAction = [...actionCounts.entries()].map(([action, count]) => ({ action, count }));
        return {
            range,
            bookingsByBucket,
            loginsByBucket,
            revenueByBucket,
            paymentStatusDistribution,
            bookingStatusDistribution,
            activityByAction,
        };
    }
    async widgets() {
        const recentBookings = await this.prisma.booking.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { tour: { select: { id: true, name: true } } },
        });
        const recentRawData = await this.prisma.rawData.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, sourceId: true, status: true, createdAt: true },
        });
        const assignmentsToday = await this.prisma.assignment.findMany({
            where: { status: client_1.AssignmentStatus.DISPATCHED },
            orderBy: { startDate: 'desc' },
            take: 5,
        });
        const recentAuthActivity = await this.prisma.authActivity.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { user: { select: { id: true, email: true, name: true } } },
        });
        const recentActions = await this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { user: { select: { id: true, email: true, name: true } } },
        });
        return {
            recentBookings,
            recentRawData,
            assignmentsToday,
            recentAuthActivity,
            recentActions,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map