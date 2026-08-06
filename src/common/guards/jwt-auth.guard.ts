import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { ACCESS_TOKEN_COOKIE } from '@/common/cookies';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload as AuthenticatedUser;
      return true;
    } catch {
      return false;
    }
  }

  private extractToken(request: any): string | undefined {
    const cookieToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (cookieToken) {
      return cookieToken;
    }
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
