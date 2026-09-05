import { PrismaService } from "../prisma/prisma.service";
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.BookingStatus;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            customerName: string | null;
            hotelName: string | null;
            phone: string | null;
            mail: string | null;
            startingDate: Date | null;
            totalPax: number;
            paxDetail: string | null;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            rawDataId: string | null;
            assignmentId: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            createdWho: string | null;
        })[];
        recentRawData: {
            id: string;
            createdAt: Date;
            status: string;
            sourceId: string;
        }[];
        assignmentsToday: {
            id: string;
            createdAt: Date;
            providerId: string | null;
            updatedAt: Date;
            code: string | null;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            durationDays: number | null;
            vehicleId: string | null;
            totalPax: number;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            latitude: number | null;
            longitude: number | null;
            createdWho: string | null;
            startDate: Date;
            endDate: Date;
            pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
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
            userId: string | null;
            authProvider: import("@prisma/client").$Enums.AuthProvider | null;
            ipAddress: string | null;
            userAgent: string | null;
        })[];
        recentActions: ({
            user: {
                id: string;
                name: string | null;
                email: string;
            } | null;
        } & {
            id: string;
            entityType: string;
            entityId: string;
            action: string;
            beforeData: import("@prisma/client/runtime/library").JsonValue | null;
            afterData: import("@prisma/client/runtime/library").JsonValue | null;
            createdAt: Date;
            changedBy: string | null;
        })[];
    }>;
}
