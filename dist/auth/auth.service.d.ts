import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from './permissions.service';
import { AuthActivitiesService } from "../auth-activities/auth-activities.service";
import { DriveService } from "../drive/drive.service";
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly permissionsService;
    private readonly authActivitiesService;
    private readonly driveService;
    private readonly ipFailures;
    constructor(prisma: PrismaService, jwtService: JwtService, permissionsService: PermissionsService, authActivitiesService: AuthActivitiesService, driveService: DriveService);
    private issueTokens;
    private isIpBlocked;
    private recordIpFailure;
    private clearIpFailures;
    private recordFailedLogin;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto, ip: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    googleLogin(profile: {
        email: string;
        name?: string | null;
        providerId: string;
    }, ip: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string | undefined, userAgent?: string): Promise<{
        success: boolean;
    }>;
    private getOAuthClient;
    exchangeGoogleCode(code: string): Promise<{
        access_token?: string;
        refresh_token?: string;
    }>;
    fetchGoogleProfile(accessToken: string): Promise<{
        email: string;
        name: string | null | undefined;
        sub: string | null | undefined;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
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
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
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
}
