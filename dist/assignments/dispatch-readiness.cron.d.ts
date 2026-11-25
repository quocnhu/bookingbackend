import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { DispatchPolicyService } from "../dispatch-policy/dispatch-policy.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
export declare class DispatchReadinessCron {
    private readonly prisma;
    private readonly mail;
    private readonly dispatchPolicy;
    private readonly notifications;
    private readonly gateway;
    private readonly logger;
    private running;
    constructor(prisma: PrismaService, mail: MailService, dispatchPolicy: DispatchPolicyService, notifications: NotificationService, gateway: NotificationsGateway);
    scheduled(): Promise<void>;
    sendTomorrowReport(): Promise<{
        sent: number;
        notified: number;
        buses: number;
        issues: number;
        reason?: string;
    }>;
}
