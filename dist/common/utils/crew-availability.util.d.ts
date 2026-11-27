import type { PrismaService } from "../../prisma/prisma.service";
export type CrewKind = 'guide' | 'driver';
export interface CrewConflict {
    type: 'LEAVE' | 'HOLD' | 'ASSIGNMENT';
    userId: string;
    name: string;
    label: CrewKind;
    startDate?: Date;
    endDate?: Date;
    note?: string | null;
    assignment?: {
        id: string;
        code: string | null;
        startDate: Date;
        endDate: Date;
    };
}
export declare function hcmStartOfDay(value: Date | string): Date;
export declare function hcmEndOfDay(value: Date | string): Date;
export declare function tripDayRange(startDate: Date, endDate: Date): {
    start: Date;
    end: Date;
};
export declare function findCrewConflict(prisma: PrismaService, kind: CrewKind, userId: string, startDate: Date, endDate: Date, excludeAssignmentId?: string): Promise<CrewConflict | null>;
export declare function assertCrewAvailableForDates(prisma: PrismaService, guideId: string | null | undefined, driverId: string | null | undefined, startDate: Date, endDate: Date, excludeAssignmentId?: string): Promise<void>;
export declare function busyCrewIds(prisma: PrismaService, kind: CrewKind, userIds: string[], startDate: Date, endDate: Date, excludeAssignmentId?: string): Promise<Set<string>>;
export declare function leaveConflictIds(prisma: PrismaService, userIds: string[], startDate: Date, endDate: Date): Promise<Set<string>>;
export declare function activeHoldIds(prisma: PrismaService, guideIds: string[], startDate: Date, endDate: Date): Promise<Set<string>>;
export declare function unavailableCrewIds(prisma: PrismaService, kind: CrewKind, userIds: string[], startDate: Date, endDate: Date, excludeAssignmentId?: string): Promise<Set<string>>;
export declare const crewRole: (kind: CrewKind) => "TOUR_GUIDE" | "DRIVER";
