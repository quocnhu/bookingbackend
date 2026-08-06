import { PrismaService } from "../prisma/prisma.service";
import { AuthProvider } from '@prisma/client';
import { QueryAuthActivityDto } from './dto/query-auth-activity.dto';
import { PaginatedResult } from "../common/dto/pagination.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export interface AuthActivityInput {
    userId?: string | null;
    eventType: string;
    authProvider?: AuthProvider;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuthActivitiesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    record(input: AuthActivityInput): Promise<void>;
    findAll(query: QueryAuthActivityDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>>;
}
