import { PermissionsService } from './permissions.service';
import { CreatePermissionDto, QueryPermissionDto, UpdatePermissionDto } from './dto/permission.dto';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    findAll(query: QueryPermissionDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findAllForSelect(): Promise<{
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
