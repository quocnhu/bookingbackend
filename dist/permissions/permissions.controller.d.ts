import { PermissionsService } from './permissions.service';
import { QueryPermissionDto } from './dto/permission.dto';
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
}
