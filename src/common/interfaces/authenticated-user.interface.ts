import { RoleType } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: RoleType;
  providerId?: string | null;
  permissions: string[];
}
