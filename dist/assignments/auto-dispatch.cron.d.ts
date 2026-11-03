import { OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AutoCrewService } from "../queues/auto-crew.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignmentsService } from './assignments.service';
export declare const AUTO_DISPATCH_ENABLED_KEY = "autoDispatchEnabled";
export declare const AUTO_DISPATCH_CRON_KEY = "autoDispatchCron";
export declare const DEFAULT_AUTO_DISPATCH_CRON = "0 4 * * *";
export declare const AUTO_DISPATCH_TIMEZONE: string;
export interface AutoDispatchSettings {
    enabled: boolean;
    cron: string;
    timezone: string;
    nextRun: string | null;
}
export declare class AutoDispatchCron implements OnModuleInit {
    private readonly autoCrewService;
    private readonly assignmentsService;
    private readonly prisma;
    private readonly auditService;
    private readonly schedulerRegistry;
    private readonly logger;
    constructor(autoCrewService: AutoCrewService, assignmentsService: AssignmentsService, prisma: PrismaService, auditService: AuditService, schedulerRegistry: SchedulerRegistry);
    onModuleInit(): Promise<void>;
    getSettings(): Promise<AutoDispatchSettings>;
    updateSettings(input: {
        enabled?: boolean;
        cron?: string;
    }, actorId?: string | null): Promise<AutoDispatchSettings>;
    private ensureSettings;
    private validateCron;
    private reschedule;
    private getNextRun;
    private runScheduledDispatch;
}
