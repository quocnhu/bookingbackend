import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";
export declare const PICKUP_REMINDER_ENABLED_KEY = "pickupReminderEnabled";
export declare const PICKUP_REMINDER_TIME_KEY = "pickupReminderTime";
export interface PickupReminderSettings {
    enabled: boolean;
    time: string;
    timezone: string;
}
export declare class PickupReminderCron {
    private readonly prisma;
    private readonly mail;
    private readonly audit;
    private readonly logger;
    private running;
    constructor(prisma: PrismaService, mail: MailService, audit: AuditService);
    scheduled(): Promise<void>;
    runNow(now?: Date): Promise<{
        checked: number;
        sent: number;
        failed: number;
        skipped: number;
    }>;
    getSettings(): Promise<PickupReminderSettings>;
    updateSettings(input: {
        enabled?: boolean;
        time?: string;
    }, actorId?: string | null): Promise<PickupReminderSettings>;
}
