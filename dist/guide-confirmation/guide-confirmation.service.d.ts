import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";
import { NotificationService } from "../notifications/notification.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { GuideConfirmationStatus, QueryGuideConfirmationDto } from './dto/query-guide-confirmation.dto';
export declare class GuideConfirmationService {
    private readonly prisma;
    private readonly audit;
    private readonly mail;
    private readonly notificationService;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService, mail: MailService, notificationService: NotificationService, gateway: NotificationsGateway);
    list(query: QueryGuideConfirmationDto): Promise<{
        items: {
            id: string;
            code: string | null;
            tourName: string | null;
            startDate: Date;
            endDate: Date;
            totalPax: number;
            status: import("@prisma/client").$Enums.AssignmentStatus;
            guide: {
                guideProfile: {
                    type: import("@prisma/client").$Enums.GuideType;
                } | null;
                name: string | null;
                id: string;
                email: string;
            } | null;
            driver: {
                name: string | null;
                id: string;
            } | null;
            provider: {
                name: string;
                id: string;
                isCompany: boolean;
            } | null;
            vehicle: {
                id: string;
                plateNumber: string;
            } | null;
            confirmationStatus: GuideConfirmationStatus;
            guideConfirmationRequestedAt: Date | null;
            guideConfirmationEmailSentAt: Date | null;
            guideConfirmedAt: Date | null;
            guideDeclinedAt: Date | null;
            guideDeclineReason: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    request(assignmentId: string, options?: {
        actorId?: string | null;
        reminder?: boolean;
    }): Promise<{
        requested: boolean;
        reason: string;
        emailed?: undefined;
        autoConfirmed?: undefined;
    } | {
        requested: boolean;
        emailed: boolean;
        autoConfirmed: boolean;
        reason?: undefined;
    }>;
    ensureCompanyGuideConfirmed(assignmentId: string): Promise<boolean>;
    confirm(assignmentId: string, actor: AuthenticatedUser): Promise<{
        confirmedAt: Date;
    }>;
    decline(assignmentId: string, actor: AuthenticatedUser, reason?: string): Promise<{
        declinedAt: Date;
    }>;
    reset(assignmentId: string): Promise<void>;
    private loadAssignment;
    private assertCanRespond;
    private isAdminOrOffice;
    private notifyAdmins;
    private notifyGuide;
    private formatWhen;
}
