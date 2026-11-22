import { DashboardService } from './dashboard.service';
import type { RangeKey } from './dashboard.service';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    private canViewFinance;
    stats(user: AuthenticatedUser, fromDate?: string, toDate?: string): Promise<{
        totalBookings: number;
        todayBookings: number;
        pendingBookings: number;
        todayDispatched: number;
        totalTours: number;
        totalUsers: number;
        totalRoles: number;
        totalPermissions: number;
        totalAssignments: number;
        todayLogins: number;
        lockedAccounts: number;
        totalRevenue: number | null;
        revenueToday: number | null;
        pendingRevenue: number | null;
        localUsers: number;
        googleUsers: number;
        customerUsers: number;
        googleCustomers: number;
        settledToCompany: number | null;
        settledToGuide: number | null;
        revenueFrom: string | null;
        revenueTo: string | null;
        canViewFinance: boolean;
    }>;
    charts(user: AuthenticatedUser, range?: RangeKey): Promise<{
        range: RangeKey;
        bookingsByBucket: {
            label: string;
            count: number;
        }[];
        loginsByBucket: {
            label: string;
            count: number;
        }[];
        revenueByBucket: {
            label: string;
            amount: number;
        }[];
        paymentStatusDistribution: {
            status: import("@prisma/client").$Enums.PaymentStatus;
            value: number;
        }[];
        bookingStatusDistribution: {
            status: import("@prisma/client").$Enums.BookingStatus;
            value: number;
        }[];
        activityByAction: {
            action: string;
            count: number;
        }[];
        canViewFinance: boolean;
    }>;
    widgets(): Promise<{
        recentBookings: {
            tour: {
                name: string;
                id: string;
            } | null;
            id: string;
            totalPax: number;
            status: import("@prisma/client").$Enums.BookingStatus;
            bookingRef: string;
            customerName: string | null;
        }[];
        recentAuthActivity: {
            user: {
                name: string | null;
                id: string;
                email: string;
            } | null;
            id: string;
            createdAt: Date;
            eventType: string;
            userId: string | null;
        }[];
        recentActions: {
            user: {
                name: string | null;
                id: string;
                email: string;
            } | null;
            id: string;
            action: string;
            createdAt: Date;
            changedBy: string | null;
        }[];
    }>;
}
