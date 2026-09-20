import { CoordinatesService } from './coordinates.service';
import { CreateCoordinateDto, QueryCoordinateDto, UpdateCoordinateDto } from './dto/coordinate.dto';
export declare class CoordinatesController {
    private readonly coordinatesService;
    constructor(coordinatesService: CoordinatesService);
    findAll(query: QueryCoordinateDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string): Promise<{
        latitude: number;
        longitude: number;
        id: string;
        address: string;
        hotelName: string;
        createdAt: Date;
        updatedAt: Date;
        coordinate: string | null;
        starRating: string | null;
    }>;
    create(dto: CreateCoordinateDto): Promise<{
        latitude: number;
        longitude: number;
        id: string;
        address: string;
        hotelName: string;
        createdAt: Date;
        updatedAt: Date;
        coordinate: string | null;
        starRating: string | null;
    }>;
    update(id: string, dto: UpdateCoordinateDto): Promise<{
        latitude: number;
        longitude: number;
        id: string;
        address: string;
        hotelName: string;
        createdAt: Date;
        updatedAt: Date;
        coordinate: string | null;
        starRating: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
