import { TourCategoriesService } from './tour-categories.service';
import { CreateTourCategoryDto, UpdateTourCategoryDto } from './dto/tour-category.dto';
export declare class TourCategoriesController {
    private readonly tourCategoriesService;
    constructor(tourCategoriesService: TourCategoriesService);
    findAll(): Promise<({
        _count: {
            tours: number;
        };
    } & {
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        description: string | null;
        slug: string;
        sortOrder: number;
    })[]>;
    findAllAdmin(): Promise<({
        _count: {
            tours: number;
        };
    } & {
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        description: string | null;
        slug: string;
        sortOrder: number;
    })[]>;
    create(dto: CreateTourCategoryDto): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        description: string | null;
        slug: string;
        sortOrder: number;
    }>;
    update(id: string, dto: UpdateTourCategoryDto): Promise<{
        updatedAt: Date;
        name: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        description: string | null;
        slug: string;
        sortOrder: number;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
