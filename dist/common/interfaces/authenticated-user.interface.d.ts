import { RoleType } from '@prisma/client';
export interface AuthenticatedUser {
    id: string;
    email: string;
    name?: string | null;
    role: RoleType;
    userType?: string | null;
    providerId?: string | null;
    permissions: string[];
}
