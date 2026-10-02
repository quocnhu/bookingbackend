import { CoordinatesService } from './coordinates.service';
import { CreateCoordinateDto, QueryCoordinateDto, UpdateCoordinateDto } from './dto/coordinate.dto';
export declare class CoordinatesController {
    private readonly coordinatesService;
    constructor(coordinatesService: CoordinatesService);
    findAll(query: QueryCoordinateDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        coordinate: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        latitude: number;
        longitude: number;
        hotelName: string;
        starRating: string | null;
    }>;
    create(dto: CreateCoordinateDto): Promise<{
        coordinate: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        latitude: number;
        longitude: number;
        hotelName: string;
        starRating: string | null;
    }>;
    update(id: string, dto: UpdateCoordinateDto): Promise<{
        coordinate: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        latitude: number;
        longitude: number;
        hotelName: string;
        starRating: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
