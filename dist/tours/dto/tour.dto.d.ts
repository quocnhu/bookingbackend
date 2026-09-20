import { PaginationDto } from '@/common/dto/pagination.dto';
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
    privateDiscountPercent?: number;
    groupDiscountPercent?: number;
    promotionStartsAt?: string;
    promotionEndsAt?: string;
    typePrices?: TourTypePriceDto[];
}
export declare class TourTypePriceDto {
    type: TourType;
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
    departureLocation?: string;
    transportation?: string;
    overview?: string;
    highlights?: string;
    includedServices?: string;
    excludedServices?: string;
    childrenPolicy?: string;
    regulations?: string;
    insurancePolicy?: string;
    mapQuery?: string;
    adultPrice?: number;
    childPrice?: number;
    infantPrice?: number;
    currency?: string;
    privateDiscountPercent?: number;
    groupDiscountPercent?: number;
    promotionStartsAt?: string;
    promotionEndsAt?: string;
    typePrices?: TourTypePriceDto[];
}
export declare class ItineraryItemDto {
    id?: string;
    dayNumber: number;
    orderIndex: number;
    title: string;
    description?: string;
    timeSlot?: string;
    location?: string;
    imageUrl?: string;
    mapQuery?: string;
}
export declare class UpdateItineraryDto {
    items: ItineraryItemDto[];
}
export declare class ReorderGalleryDto {
    files: string[];
}
export declare class QueryTourDto extends PaginationDto {
    type?: TourType;
}
