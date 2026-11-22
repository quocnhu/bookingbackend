import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { DispatchPolicyService } from "../dispatch-policy/dispatch-policy.service";
export declare class WaitingListCron {
    private readonly prisma;
    private readonly notificationService;
    private readonly gateway;
    private readonly dispatchPolicy;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: NotificationService, gateway: NotificationsGateway, dispatchPolicy: DispatchPolicyService);
    scheduled(): Promise<void>;
}
