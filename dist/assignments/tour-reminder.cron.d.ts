import { PrismaService } from "../prisma/prisma.service";
import { AutoCrewService } from "../queues/auto-crew.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
export declare class TourReminderCron {
    private readonly prisma;
    private readonly autoCrew;
    private readonly notificationService;
    private readonly gateway;
    private readonly logger;
    private running;
    constructor(prisma: PrismaService, autoCrew: AutoCrewService, notificationService: NotificationService, gateway: NotificationsGateway);
    scheduled(): Promise<void>;
    sendTomorrowReminders(targetDate?: Date): Promise<{
        scanned: number;
        notified: number;
        missingCrew: number;
    }>;
    private fillCrewIfAutomatic;
    private sendRemindersForDate;
    private buildReminderBody;
    private notifyAdmins;
    private alreadyNotified;
    private formatDateTime;
    private tomorrowStart;
    private startOfDay;
    private endOfDay;
}
