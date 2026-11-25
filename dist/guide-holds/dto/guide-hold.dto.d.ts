import { GuideHoldStatus } from '@prisma/client';
export declare class CreateGuideHoldDto {
    guideId: string;
    startDate: string;
    endDate: string;
    note?: string;
}
export declare class UpdateGuideHoldDto {
    startDate?: string;
    endDate?: string;
    note?: string;
}
export declare class QueryGuideHoldDto {
    guideId?: string;
    status?: GuideHoldStatus;
    from?: string;
    to?: string;
}
