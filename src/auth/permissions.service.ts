import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Quyền = quyền của role(s) + quyền cá nhân (user permissions). */
  async resolveUserPermissions(userId: string): Promise<string[]> {
    const [rolePermissions, userPermissions] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: { role: { users: { some: { userId } } } },
        select: { permission: { select: { code: true } } },
      }),
      this.prisma.userPermission.findMany({
        where: { userId },
        select: { permission: { select: { code: true } } },
      }),
    ]);

    const codes = new Set<string>();
    rolePermissions.forEach((rp) => codes.add(rp.permission.code));
    userPermissions.forEach((up) => codes.add(up.permission.code));
    return [...codes];
  }

  async toAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, userType: true, providerId: true },
    });
    const permissions = await this.resolveUserPermissions(userId);
    return { ...user, permissions };
  }
}
