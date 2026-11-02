import { DashboardService } from './dashboard.service';
import type { RangeKey } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    stats(): Promise<{
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
    }>;
    charts(range?: RangeKey): Promise<{
        range: RangeKey;
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
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            totalPax: number;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.BookingStatus;
            createdWho: string | null;
            assignmentId: string | null;
            notes: string | null;
            currency: string;
            tourId: string | null;
            bookingRef: string;
            confirmationCode: string | null;
            source: string | null;
            channel: import("@prisma/client").$Enums.BookingProvider;
            address: string | null;
            startingDate: Date | null;
            customerName: string | null;
            hotelName: string;
            phone: string;
            mail: string | null;
            paxDetail: string | null;
            payment: import("@prisma/client").$Enums.PaymentStatus | null;
            isNoShow: boolean;
            noShowReason: string | null;
            extra: import("@prisma/client/runtime/library").JsonValue | null;
            departureTime: string | null;
            rawDataId: string | null;
            customerUserId: string | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            payLater: boolean;
            paymentDueAt: Date | null;
            paymentNote: string | null;
            totalAmount: import("@prisma/client/runtime/library").Decimal | null;
            paymentCollectedAt: Date | null;
            paymentCollectedById: string | null;
            paymentCollectedByName: string | null;
            paymentConfirmedAt: Date | null;
            paymentConfirmedById: string | null;
            paymentConfirmedByName: string | null;
            paxSequence: number;
            movedFromBusId: string | null;
            emailDate: Date | null;
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
            startDate: Date;
            endDate: Date;
            tourName: string | null;
            tourType: import("@prisma/client").$Enums.TourType | null;
            durationDays: number | null;
            totalPax: number;
            pickupInfo: import("@prisma/client/runtime/library").JsonValue | null;
            latitude: number | null;
            longitude: number | null;
            vehicleId: string | null;
            driverId: string | null;
            guideId: string | null;
            reportVerifierId: string | null;
            executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
            partnerId: string | null;
            partnerStatus: import("@prisma/client").$Enums.PartnerHandoffStatus | null;
            partnerContractRef: string | null;
            partnerAmount: import("@prisma/client/runtime/library").Decimal | null;
            partnerCurrency: string | null;
            partnerMoneyFlow: import("@prisma/client").$Enums.PartnerMoneyFlow | null;
            partnerConfirmedById: string | null;
            partnerConfirmedByName: string | null;
            partnerConfirmedAt: Date | null;
            partnerReturnedAt: Date | null;
            partnerReturnNote: string | null;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            origin: import("@prisma/client").$Enums.AssignmentOrigin;
            sequenceIndex: number;
            priceOverride: import("@prisma/client/runtime/library").Decimal | null;
            tripNotes: string | null;
            createdWho: string | null;
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
