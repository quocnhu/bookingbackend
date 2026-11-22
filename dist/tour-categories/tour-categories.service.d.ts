import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateTourCategoryDto, UpdateTourCategoryDto } from './dto/tour-category.dto';
export declare class TourCategoriesService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    findAll(includeInactive?: boolean): Promise<({
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
    findOne(id: string): Promise<{
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
    }>;
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
    private nextSortOrder;
    private nextSlug;
}
