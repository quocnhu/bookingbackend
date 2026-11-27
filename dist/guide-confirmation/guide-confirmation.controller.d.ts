import { GuideConfirmationService } from './guide-confirmation.service';
import { QueryGuideConfirmationDto } from './dto/query-guide-confirmation.dto';
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class GuideConfirmationController {
    private readonly service;
    constructor(service: GuideConfirmationService);
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
            confirmationStatus: import("./dto/query-guide-confirmation.dto").GuideConfirmationStatus;
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
    confirm(id: string, actor: AuthenticatedUser): Promise<{
        confirmedAt: Date;
    }>;
    decline(id: string, reason: string | undefined, actor: AuthenticatedUser): Promise<{
        declinedAt: Date;
    }>;
    resend(id: string, actor: AuthenticatedUser): Promise<{
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
}
