import { PrismaService } from "../prisma/prisma.service";
export type RangeKey = 'day' | 'week' | 'month';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private buildBuckets;
    private bucketIndex;
    stats(fromDate?: string, toDate?: string, canViewFinance?: boolean): Promise<{
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
        touristUsers: number;
        localTourists: number;
        googleTourists: number;
        settledToCompany: number | null;
        settledToGuide: number | null;
        revenueFrom: string | null;
        revenueTo: string | null;
        canViewFinance: boolean;
    }>;
    charts(range: RangeKey, canViewFinance?: boolean): Promise<{
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
