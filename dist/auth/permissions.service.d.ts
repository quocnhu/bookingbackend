import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
export declare class PermissionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    resolveUserPermissions(userId: string): Promise<string[]>;
    toAuthenticatedUser(userId: string): Promise<AuthenticatedUser>;
}
