import { PrismaService } from "../prisma/prisma.service";
import { QueryPermissionDto } from './dto/permission.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
export declare class PermissionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: QueryPermissionDto): Promise<PaginatedResult<any>>;
    findAllFlat(): Promise<{
        name: string;
        id: string;
        code: string;
        group: string | null;
    }[]>;
    findOne(id: string): Promise<{
        name: string;
        id: string;
        code: string;
        group: string | null;
    }>;
}
