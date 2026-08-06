import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
export declare class JwtAuthGuard {
    private readonly jwtService;
    private readonly reflector;
    constructor(jwtService: JwtService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
}
