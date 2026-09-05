import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateCoordinateDto, QueryCoordinateDto, UpdateCoordinateDto } from './dto/coordinate.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
export declare class CoordinatesService {
    private readonly prisma;
    private readonly auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    findAll(query: QueryCoordinateDto): Promise<PaginatedResult<any>>;
    findOne(id: string): Promise<{
        coordinate: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelName: string;
        address: string;
        latitude: number;
        longitude: number;
        starRating: string | null;
    }>;
    create(dto: CreateCoordinateDto): Promise<{
        coordinate: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelName: string;
        address: string;
        latitude: number;
        longitude: number;
        starRating: string | null;
    }>;
    update(id: string, dto: UpdateCoordinateDto): Promise<{
        coordinate: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelName: string;
        address: string;
        latitude: number;
        longitude: number;
        starRating: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
