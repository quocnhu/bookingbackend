import { PrismaService } from "../prisma/prisma.service";
export declare const AUTO_DISPATCH_ENABLED_KEY = "autoDispatchEnabled";
export declare const AUTO_DISPATCH_CRON_KEY = "autoDispatchCron";
export declare const AUTO_MODE_ACTIVATED_AT_KEY = "autoModeActivatedAt";
export declare const ASSIGN_MODE_KEY = "assignMode";
export declare const DEFAULT_AUTO_DISPATCH_CRON = "0 23 * * *";
export declare const DEFAULT_DISPATCH_CUTOFF = "23:00";
export declare const DISPATCH_TIMEZONE = "Asia/Ho_Chi_Minh";
export interface SealInfo {
    sealed: boolean;
    urgent: boolean;
    autoMode: boolean;
    cutoffTime: string;
    cutoffAt: string;
    activatedAt: string | null;
    timezone: string;
}
export declare class DispatchPolicyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMode(): Promise<{
        autoMode: boolean;
        assignMode: "MANUAL" | "AUTO_ASSIGN";
        enabled: boolean;
        cron: string;
        cutoffTime: string;
        activatedAt: Date | null;
    }>;
    getSealInfo(startDate: Date | string): Promise<SealInfo>;
    isSealed(startDate: Date | string | null | undefined): Promise<boolean>;
    cutoffFor(startDate: Date | string, cutoffTime?: string): Date;
    dayRange(startDate: Date | string): {
        start: Date;
        end: Date;
    };
    dayKey(date: Date | string): string;
    todayHcm(): {
        start: Date;
        end: Date;
    };
    addDays(date: Date, days: number): Date;
    latePlacementOpenAt(startDate: Date | string): Date;
    cronToCutoff(cron: string): string;
    private hcmParts;
}
