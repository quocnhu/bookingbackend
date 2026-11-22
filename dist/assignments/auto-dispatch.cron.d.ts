import { OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AutoCrewService } from "../queues/auto-crew.service";
import { AUTO_DISPATCH_CRON_KEY, AUTO_DISPATCH_ENABLED_KEY, DEFAULT_AUTO_DISPATCH_CRON, DispatchPolicyService } from "../dispatch-policy/dispatch-policy.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AssignmentsService } from './assignments.service';
export { AUTO_DISPATCH_ENABLED_KEY, AUTO_DISPATCH_CRON_KEY, DEFAULT_AUTO_DISPATCH_CRON, };
export declare const AUTO_DISPATCH_TIMEZONE: string;
export interface AutoDispatchSettings {
    enabled: boolean;
    cron: string;
    cutoffTime: string;
    timezone: string;
    nextRun: string | null;
}
export declare class AutoDispatchCron implements OnModuleInit {
    private readonly autoCrewService;
    private readonly assignmentsService;
    private readonly prisma;
    private readonly auditService;
    private readonly schedulerRegistry;
    private readonly dispatchPolicy;
    private readonly logger;
    constructor(autoCrewService: AutoCrewService, assignmentsService: AssignmentsService, prisma: PrismaService, auditService: AuditService, schedulerRegistry: SchedulerRegistry, dispatchPolicy: DispatchPolicyService);
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
