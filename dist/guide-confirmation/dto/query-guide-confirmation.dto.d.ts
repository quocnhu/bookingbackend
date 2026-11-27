import { GuideType } from '@prisma/client';
export declare enum GuideConfirmationStatus {
    AWAITING = "AWAITING",
    CONFIRMED = "CONFIRMED",
    DECLINED = "DECLINED"
}
export declare class QueryGuideConfirmationDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: GuideConfirmationStatus;
    guideType?: GuideType;
    from?: string;
    to?: string;
}
