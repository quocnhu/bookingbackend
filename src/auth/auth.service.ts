import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { google } from 'googleapis';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionsService } from './permissions.service';
import { AuthActivitiesService } from '@/auth-activities/auth-activities.service';
import { DriveService } from '@/drive/drive.service';
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateProfileDto } from './dto/auth.dto';
import { AuthProvider, RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000; // 1h
const MAX_IP_FAILURES = 20;
const IP_BLOCK_MS = 60 * 60 * 1000; // 1h

interface IpFailure {
  count: number;
  until: number;
}

@Injectable()
export class AuthService {
  private readonly ipFailures = new Map<string, IpFailure>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
    private readonly authActivitiesService: AuthActivitiesService,
    private readonly driveService: DriveService,
  ) {}

  private async issueTokens(user: AuthenticatedUser) {
    const accessToken = await this.jwtService.signAsync(user, {
      secret: process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      {
        secret: process.env.REFRESH_SECRET,
        expiresIn: (process.env.REFRESH_EXPIRES_IN || '7d') as any,
      },
    );
    return { accessToken, refreshToken };
  }

  private isIpBlocked(ip: string): boolean {
    const entry = this.ipFailures.get(ip);
    if (!entry) return false;
    if (Date.now() > entry.until) {
      this.ipFailures.delete(ip);
      return false;
    }
    return entry.count >= MAX_IP_FAILURES;
  }

  private recordIpFailure(ip: string) {
    const entry = this.ipFailures.get(ip) ?? { count: 0, until: 0 };
    entry.count += 1;
    entry.until = Date.now() + IP_BLOCK_MS;
    this.ipFailures.set(ip, entry);
  }

  private clearIpFailures(ip: string) {
    this.ipFailures.delete(ip);
  }

  private async recordFailedLogin(userId: string | null, ip: string, userAgent?: string) {
    this.recordIpFailure(ip);
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;
      const attempts = user.failedLoginAttempts + 1;
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: attempts,
          lockoutUntil: attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : user.lockoutUntil,
        },
      });
    }
    await this.authActivitiesService.record({
      userId,
      eventType: 'LOGIN_FAILED',
      ipAddress: ip,
      userAgent,
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
      },
    });
    const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
    await this.driveService.ensureUserDrive(user.id);
    return this.issueTokens(authUser);
  }

  async login(dto: LoginDto, ip: string, userAgent?: string) {
    if (this.isIpBlocked(ip)) {
      throw new UnauthorizedException('Too many failed attempts from this IP. Try again later.');
    }
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (user && user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new UnauthorizedException(
        `Account is locked due to too many failed attempts. Try again after 1 hour.`,
      );
    }

    if (!user || !user.passwordHash || !user.isActive) {
      await this.recordFailedLogin(user?.id ?? null, ip, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(user.id, ip, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedLoginAttempts: 0, lockoutUntil: null },
    });
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token: randomUUID(),
        loggedInAt: new Date(),
        ipAddress: ip,
      },
    });
    this.clearIpFailures(ip);
    await this.authActivitiesService.record({
      userId: user.id,
      eventType: 'LOGIN',
      authProvider: user.authProvider,
      ipAddress: ip,
      userAgent,
    });
    const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
    await this.driveService.ensureUserDrive(user.id);
    return this.issueTokens(authUser);
  }

  /** Upsert user sau Google login; mặc định gán role CUSTOMER. */
  async googleLogin(profile: { email: string; name?: string | null; providerId: string }, ip: string, userAgent?: string) {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          authProvider: AuthProvider.GOOGLE,
          providerId: profile.providerId,
          role: RoleType.CUSTOMER,
          userType: 'customer',
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token: randomUUID(),
        loggedInAt: new Date(),
        ipAddress: ip,
      },
    });
    await this.authActivitiesService.record({
      userId: user.id,
      eventType: 'LOGIN',
      authProvider: AuthProvider.GOOGLE,
      ipAddress: ip,
      userAgent,
    });
    const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
    await this.driveService.ensureUserDrive(user.id);
    return this.issueTokens(authUser);
  }

  async logout(refreshToken: string | undefined, userAgent?: string) {
    let userId: string | null = null;
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshToken, {
          secret: process.env.REFRESH_SECRET,
        });
        if (payload.type === 'refresh') {
          userId = payload.sub;
        }
        if (userId) {
          await this.prisma.userSession.updateMany({
            where: { userId, loggedOutAt: null },
            data: { loggedOutAt: new Date() },
          });
        }
      } catch {
        // Token hết hạn/hỏng: vẫn cho logout.
      }
    }
    if (userId) {
      await this.authActivitiesService.record({
        userId,
        eventType: 'LOGOUT',
        userAgent,
      });
    }
    return { success: true };
  }

  private getOAuthClient() {
    return new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`,
    });
  }

  async exchangeGoogleCode(code: string): Promise<{ access_token?: string; refresh_token?: string }> {
    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(code);
    return {
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
    };
  }

  async fetchGoogleProfile(accessToken: string) {
    const client = this.getOAuthClient();
    client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    return { email: data.email!, name: data.name, sub: data.id };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.REFRESH_SECRET,
      });
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        throw new UnauthorizedException('Account is locked. Try again after 1 hour.');
      }
      const authUser = await this.permissionsService.toAuthenticatedUser(user.id);
      return this.issueTokens(authUser);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        permissions: { include: { permission: true } },
      },
    });
    const authUser = await this.permissionsService.toAuthenticatedUser(userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      userType: user.userType,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      permissions: authUser.permissions,
      roles: user.roles.map((r) => r.role),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new BadRequestException('Account has no local password');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { message: 'Password updated' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.getProfile(userId);
  }
}
