import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Không có metadata → mặc định cho phép mọi user đã xác thực.
    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest().user as AuthenticatedUser;
    if (!user) {
      throw new ForbiddenException('Forbidden resource');
    }

    // ADMIN luôn có mọi quyền.
    if (user.role === RoleType.ADMIN) {
      return true;
    }

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    const userPermissions = new Set(user.permissions ?? []);
    if (requiredPermissions?.length && !requiredPermissions.every((p) => userPermissions.has(p))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
