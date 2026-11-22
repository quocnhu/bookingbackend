import { PermissionsService } from './permissions.service';
import { QueryPermissionDto } from './dto/permission.dto';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    findAll(query: QueryPermissionDto): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findAllForSelect(): Promise<{
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
