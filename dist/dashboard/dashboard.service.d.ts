import { PrismaService } from '@/prisma/prisma.service';
export type RangeKey = 'day' | 'week' | 'month';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private buildBuckets;
    private bucketIndex;
    stats(): Promise<{
        totalBookings: number;
        todayBookings: number;
        pendingBookings: number;
        todayDispatched: number;
        pendingSettlements: number;
        totalTours: number;
        totalUsers: number;
        totalRoles: number;
        totalPermissions: number;
        totalAssignments: number;
        todayLogins: number;
        lockedAccounts: number;
        revenueToday: number;
        revenueWeek: number;
        revenueMonth: number;
    }>;
    private sumSettlementRevenue;
    charts(range: RangeKey): Promise<{
        range: RangeKey;
        revenueByBucket: {
            label: string;
            revenue: number;
            collected: number;
        }[];
        bookingsByBucket: {
            label: string;
            count: number;
        }[];
        loginsByBucket: {
            label: string;
            count: number;
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
    }>;
    widgets(): Promise<{
        recentBookings: ({
            tour: {
                id: string;
                name: string;
            } | null;
        } & {
            latitude: number | null;
            longitude: number | null;
            id: string;
            bookingRef: string;
            rawDataId: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            source: string | null;
            confirmationCode: string | null;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            totalPax: number;
            paxDetail: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            collectAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        recentRawData: {
            id: string;
            status: string;
            createdAt: Date;
            sourceId: string;
        }[];
        assignmentsToday: {
            latitude: number | null;
            longitude: number | null;
            id: string;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            totalPax: number;
            tourType: import("@prisma/client").$Enums.TourType | null;
            tourName: string | null;
            createdWho: string | null;
            createdAt: Date;
            updatedAt: Date;
            code: string | null;
            startDate: Date;
            endDate: Date;
            durationDays: number | null;
            pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
            vehicleId: string | null;
            providerId: string | null;
            driverId: string | null;
            guideId: string | null;
            reportVerifierId: string | null;
            origin: import("@prisma/client").$Enums.AssignmentOrigin;
            sequenceIndex: number;
            priceOverride: import("@prisma/client/runtime/library").Decimal | null;
            tripNotes: string | null;
        }[];
        recentAuthActivity: ({
            user: {
                id: string;
                name: string | null;
                email: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            eventType: string;
            authProvider: import("@prisma/client").$Enums.AuthProvider | null;
            ipAddress: string | null;
            userAgent: string | null;
            userId: string | null;
        })[];
        recentActions: ({
            user: {
                id: string;
                name: string | null;
                email: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            entityType: string;
            entityId: string;
            action: string;
            beforeData: import("@prisma/client/runtime/library").JsonValue | null;
            afterData: import("@prisma/client/runtime/library").JsonValue | null;
            changedBy: string | null;
        })[];
    }>;
}
