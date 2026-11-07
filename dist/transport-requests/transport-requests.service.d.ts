import { Prisma } from '@prisma/client';
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { LeavesService } from "../leaves/leaves.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { AssignTransportRequestDto, CancelTransportRequestDto, DeclineTransportRequestDto, OverrideTransportRequestDto, QueryTransportRequestDto, SendTransportRequestDto, UpdateProviderAssignmentModeDto, UpdateTransportRequestSettingsDto } from './dto/transport-request.dto';
declare const DEFAULT_SETTINGS: {
    enabled: boolean;
    sendDaysBefore: number;
    sendTime: string;
    deadlineTime: string;
    minLeadHours: number;
};
type TransportSettings = typeof DEFAULT_SETTINGS;
export declare class TransportRequestsService {
    private readonly prisma;
    private readonly audit;
    private readonly leaves;
    private readonly notificationService;
    private readonly gateway;
    private readonly logger;
    private runningScheduledTick;
    constructor(prisma: PrismaService, audit: AuditService, leaves: LeavesService, notificationService: NotificationService, gateway: NotificationsGateway);
    private include;
    list(query: QueryTransportRequestDto, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }[]>;
    getCandidates(assignmentId: string, actor: AuthenticatedUser): Promise<{
        assignmentId: string;
        providerId: string;
        workloadWindow: {
            from: Date;
            to: Date;
            days: number;
        };
        drivers: {
            id: string;
            name: string | null;
            email: string;
            licenseNumber: string | null;
            rating: number;
            workloadDays: number;
            workloadTrips: number;
            available: boolean;
            busy: boolean;
            onLeave: boolean;
        }[];
        vehicles: {
            available: boolean;
            busy: boolean;
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        }[];
        recommendedDriverId: string | null;
        recommendedVehicleId: string | null;
    }>;
    private buildCandidates;
    private suggestionText;
    send(assignmentId: string, dto: SendTransportRequestDto, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }>;
    cancel(assignmentId: string, dto: CancelTransportRequestDto, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }>;
    override(assignmentId: string, dto: OverrideTransportRequestDto, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }>;
    markViewed(assignmentId: string, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }>;
    assign(assignmentId: string, dto: AssignTransportRequestDto, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }>;
    autoAssign(assignmentId: string, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }>;
    decline(assignmentId: string, dto: DeclineTransportRequestDto, actor: AuthenticatedUser): Promise<{
        id: string;
        code: string | null;
        tourName: string | null;
        tourCode: string | null;
        tourType: import("@prisma/client").$Enums.TourType | null;
        durationDays: number | null;
        totalPax: number;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssignmentStatus;
        executionMode: import("@prisma/client").$Enums.AssignmentExecutionMode;
        groupRef: string | null;
        provider: {
            id: string;
            name: string;
            isCompany: boolean;
            assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
        } | null;
        driver: {
            id: string;
            name: string | null;
            email: string;
            providerId: string | null;
        } | null;
        vehicle: {
            id: string;
            plateNumber: string;
            capacity: number | null;
            brand: string | null;
        } | null;
        guide: {
            id: string;
            name: string | null;
        } | null;
        pickups: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
        providerRequestStatus: import("@prisma/client").$Enums.TransportRequestStatus;
        providerRequestedAt: Date | null;
        providerViewedAt: Date | null;
        providerRespondedAt: Date | null;
        providerDeadline: Date | null;
        providerRequestNote: string | null;
        providerResponseNote: string | null;
        providerDeclineReason: string | null;
        providerAssignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode | null;
    }>;
    getProviderSettings(actor: AuthenticatedUser, providerId?: string): Promise<{
        id: string;
        name: string;
        assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
    }>;
    getDriverWorkload(actor: AuthenticatedUser, providerId?: string): Promise<{
        providerId: string;
        workloadWindow: {
            from: Date;
            to: Date;
            days: number;
        };
        drivers: {
            id: string;
            name: string | null;
            email: string;
            licenseNumber: string | null;
            rating: number;
            workloadDays: number;
            workloadTrips: number;
            busyToday: boolean;
            onLeaveToday: boolean;
            availableToday: boolean;
        }[];
    }>;
    updateProviderSettings(dto: UpdateProviderAssignmentModeDto, actor: AuthenticatedUser): Promise<{
        id: string;
        name: string;
        assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
    }>;
    getSettings(): Promise<TransportSettings>;
    updateSettings(dto: UpdateTransportRequestSettingsDto, actor: AuthenticatedUser): Promise<{
        enabled: boolean;
        sendDaysBefore: number;
        sendTime: string;
        deadlineTime: string;
        minLeadHours: number;
    }>;
    scheduledTick(): Promise<void>;
    processDueRequests(): Promise<{
        sent: number;
        expired: number;
        autoAssigned: number;
    }>;
    private sendInternal;
    private expire;
    private tryAutoAssignInternal;
    private applyAssignment;
    private notifyCrewAssigned;
    private notifyUsers;
    private loadAssignment;
    private assertRequestable;
    private assertProviderCanRespond;
    private assertChangeWindowOpen;
    private isAdminOrOffice;
    private isProvider;
    private assertAdminOrOffice;
    private assertProviderAccess;
    private resolveProviderId;
    private toView;
    private notifyProvider;
    private notifyAdmins;
    private busyDriverIds;
    private busyVehicleIds;
    private driverWorkload;
    private leaveMap;
    private computeSendAt;
    private computeDeadline;
    private hcmDateTime;
    private startOfDay;
    private endOfDay;
    private daysAgo;
    private daysAhead;
    private intSetting;
    private formatDateTime;
}
export {};
