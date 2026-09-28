import type { Response } from 'express';
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto, RefreshTokenDto, RegisterDto, UpdateProfileDto } from "./dto/auth.dto";
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    private setAuthCookies;
    private clearAuthCookies;
    register(dto: RegisterDto, res: Response): Promise<{
        success: boolean;
    }>;
    login(dto: LoginDto, req: any, res: Response): Promise<{
        success: boolean;
    }>;
    refresh(dto: RefreshTokenDto, req: any, res: Response): Promise<{
        success: boolean;
    }>;
    logout(req: any, res: Response): Promise<{
        success: boolean;
    }>;
    googleLogin(redirect: string | undefined, res: Response): void;
    googleCallback(code: string, state: string, req: any, res: Response): Promise<void>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.RoleType;
        userType: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        createdAt: Date;
        providerId: string | null;
        permissions: string[];
        roles: ({
            permissions: ({
                permission: {
                    id: string;
                    name: string;
                    code: string;
                    group: string | null;
                };
            } & {
                roleId: string;
                permissionId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
            isSystem: boolean;
        })[];
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.RoleType;
        userType: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        createdAt: Date;
        providerId: string | null;
        permissions: string[];
        roles: ({
            permissions: ({
                permission: {
                    id: string;
                    name: string;
                    code: string;
                    group: string | null;
                };
            } & {
                roleId: string;
                permissionId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
            isSystem: boolean;
        })[];
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    userInfo(req: any): any;
}
