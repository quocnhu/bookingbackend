import { PrismaService } from '@/prisma/prisma.service';
import { CreatePermissionDto, QueryPermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
export declare class PermissionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: QueryPermissionDto): Promise<PaginatedResult<any>>;
    findAllFlat(): Promise<{
        id: string;
        name: string;
        code: string;
        group: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        code: string;
        group: string | null;
    }>;
    create(dto: CreatePermissionDto): Promise<{
        id: string;
        name: string;
        code: string;
        group: string | null;
    }>;
    update(id: string, dto: UpdatePermissionDto): Promise<{
        id: string;
        name: string;
        code: string;
        group: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
