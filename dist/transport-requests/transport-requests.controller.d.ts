import { TransportRequestsService } from './transport-requests.service';
import { AssignTransportRequestDto, CancelTransportRequestDto, DeclineTransportRequestDto, OverrideTransportRequestDto, QueryTransportRequestDto, SendTransportRequestDto, UpdateProviderAssignmentModeDto, UpdateTransportRequestSettingsDto } from './dto/transport-request.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class TransportRequestsController {
    private readonly service;
    constructor(service: TransportRequestsService);
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    getSettings(): Promise<{
        enabled: boolean;
        sendDaysBefore: number;
        sendTime: string;
        deadlineTime: string;
        minLeadHours: number;
    }>;
    updateSettings(dto: UpdateTransportRequestSettingsDto, actor: AuthenticatedUser): Promise<{
        enabled: boolean;
        sendDaysBefore: number;
        sendTime: string;
        deadlineTime: string;
        minLeadHours: number;
    }>;
    getProviderSettings(actor: AuthenticatedUser, providerId?: string): Promise<{
        id: string;
        name: string;
        assignmentMode: import("@prisma/client").$Enums.ProviderAssignmentMode;
    }>;
    updateProviderSettings(dto: UpdateProviderAssignmentModeDto, actor: AuthenticatedUser): Promise<{
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
    send(id: string, dto: SendTransportRequestDto, actor: AuthenticatedUser): Promise<{
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    cancel(id: string, dto: CancelTransportRequestDto, actor: AuthenticatedUser): Promise<{
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    override(id: string, dto: OverrideTransportRequestDto, actor: AuthenticatedUser): Promise<{
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    markViewed(id: string, actor: AuthenticatedUser): Promise<{
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    assign(id: string, dto: AssignTransportRequestDto, actor: AuthenticatedUser): Promise<{
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    autoAssign(id: string, actor: AuthenticatedUser): Promise<{
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    decline(id: string, dto: DeclineTransportRequestDto, actor: AuthenticatedUser): Promise<{
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
        pickups: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
}
