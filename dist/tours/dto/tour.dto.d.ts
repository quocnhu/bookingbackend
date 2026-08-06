import { PaginationDto } from "../../common/dto/pagination.dto";
import { TourType } from '@prisma/client';
export declare class CreateTourDto {
    name: string;
    code?: string;
    type: TourType;
    thumbnailUrl?: string;
    durationDays?: number;
    adultPrice?: number;
    childPrice?: number;
    infantPrice?: number;
    currency?: string;
}
export declare class UpdateTourDto {
    name?: string;
    code?: string;
    type?: TourType;
    thumbnailUrl?: string;
    durationDays?: number;
    adultPrice?: number;
    childPrice?: number;
    infantPrice?: number;
    currency?: string;
}
export declare class ItineraryItemDto {
    id?: string;
    dayNumber: number;
    orderIndex: number;
    title: string;
    description?: string;
    timeSlot?: string;
    location?: string;
}
export declare class UpdateItineraryDto {
    items: ItineraryItemDto[];
}
export declare class QueryTourDto extends PaginationDto {
    q?: string;
    type?: TourType;
}
