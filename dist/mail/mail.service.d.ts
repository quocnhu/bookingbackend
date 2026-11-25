import { PrismaService } from "../prisma/prisma.service";
import { DispatchReadinessRow } from './dispatch-readiness.template';
export type MailSendResult = {
    sent: boolean;
    reason?: string;
};
export type PickupReminderResult = {
    sent: number;
    failed: number;
    skipped: number;
    eligible: number;
    reason?: string;
};
export declare class MailService {
    private readonly prisma;
    private readonly logger;
    private transporter;
    private transporterKey;
    private readonly sendingReminders;
    constructor(prisma: PrismaService);
    isEnabled(): boolean;
    private settings;
    isConfigured(): boolean;
    private getTransporter;
    private company;
    private deliver;
    sendBookingConfirmation(bookingId: string): Promise<MailSendResult>;
    sendTransportAlert(input: {
        to: string[];
        title: string;
        message: string;
        reference?: string | null;
        actionLabel?: string | null;
        actionUrl?: string | null;
    }): Promise<{
        sent: number;
        reason?: string;
    }>;
    sendDispatchReadiness(input: {
        to: string[];
        dateKey: string;
        dateLabel: string;
        rows: DispatchReadinessRow[];
        actionUrl?: string | null;
    }): Promise<{
        sent: number;
        reason?: string;
    }>;
    sendPickupReminders(assignmentId: string, options?: {
        force?: boolean;
    }): Promise<PickupReminderResult>;
}
