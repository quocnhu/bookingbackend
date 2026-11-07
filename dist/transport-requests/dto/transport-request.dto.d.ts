import { ProviderAssignmentMode, TransportRequestStatus } from '@prisma/client';
export declare class SendTransportRequestDto {
    providerId?: string;
    note?: string;
    deadline?: string;
}
export declare class CancelTransportRequestDto {
    note?: string;
}
export declare class OverrideTransportRequestDto {
    providerId?: string;
    driverId: string;
    vehicleId: string;
    note?: string;
}
export declare class AssignTransportRequestDto {
    driverId: string;
    vehicleId: string;
    note?: string;
}
export declare class DeclineTransportRequestDto {
    reason: string;
}
export declare class UpdateTransportRequestSettingsDto {
    enabled?: boolean;
    sendDaysBefore?: number;
    sendTime?: string;
    deadlineTime?: string;
    minLeadHours?: number;
}
export declare class UpdateProviderAssignmentModeDto {
    providerId?: string;
    assignmentMode: ProviderAssignmentMode;
}
export declare class QueryTransportRequestDto {
    status?: TransportRequestStatus;
    providerId?: string;
    search?: string;
    from?: string;
    to?: string;
}
