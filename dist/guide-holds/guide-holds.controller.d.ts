import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { GuideHoldsService } from './guide-holds.service';
import { CreateGuideHoldDto, QueryGuideHoldDto, UpdateGuideHoldDto } from './dto/guide-hold.dto';
export declare class GuideHoldsController {
    private readonly service;
    constructor(service: GuideHoldsService);
    mine(actor: AuthenticatedUser): Promise<{
        id: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
    }[]>;
    list(query: QueryGuideHoldDto): Promise<({
        guide: {
            name: string | null;
            id: string;
            email: string;
        };
        createdBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
        releasedBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    })[]>;
    create(dto: CreateGuideHoldDto, actor: AuthenticatedUser): Promise<{
        guide: {
            name: string | null;
            id: string;
            email: string;
        };
        createdBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
        releasedBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    }>;
    update(id: string, dto: UpdateGuideHoldDto, actor: AuthenticatedUser): Promise<{
        guide: {
            name: string | null;
            id: string;
            email: string;
        };
        createdBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
        releasedBy: {
            name: string | null;
            id: string;
            email: string;
        } | null;
    } & {
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    }>;
    release(id: string, actor: AuthenticatedUser): Promise<{
        updatedAt: Date;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        guideId: string;
        status: import("@prisma/client").$Enums.GuideHoldStatus;
        note: string | null;
        createdById: string | null;
        releasedById: string | null;
        releasedAt: Date | null;
    }>;
}
