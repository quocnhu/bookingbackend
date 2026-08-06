import { Body, Controller, Get, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthService } from '@/auth/auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  UpdateProfileDto,
} from '@/auth/dto/auth.dto';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  cookieOptions,
  parseDuration,
} from '@/common/cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      cookieOptions(parseDuration(process.env.JWT_EXPIRES_IN, '1d')),
    );
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      cookieOptions(parseDuration(process.env.REFRESH_EXPIRES_IN, '7d')),
    );
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    this.setAuthCookies(res, tokens);
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto, req.ip, req.headers?.['user-agent']);
    this.setAuthCookies(res, tokens);
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? dto.refreshToken;
    const tokens = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, tokens);
    return { success: true };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE], req.headers?.['user-agent']);
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Public()
  @Get('google')
  googleLogin(@Query('redirect') redirect: string | undefined, @Res() res: Response) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = `${process.env.BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`;
    const state = Buffer.from(JSON.stringify({ redirect: redirect || '/' })).toString('base64url');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');
    return res.redirect(url.toString());
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const tokens = await this.authService.exchangeGoogleCode(code);
      const profile = await this.authService.fetchGoogleProfile(tokens.access_token!);
      const result = await this.authService.googleLogin(
        {
          email: profile.email,
          name: profile.name,
          providerId: profile.sub || profile.email,
        },
        req.ip,
        req.headers?.['user-agent'],
      );
      this.setAuthCookies(res, result);
      let redirect = '/';
      if (state) {
        try {
          redirect = JSON.parse(Buffer.from(state, 'base64url').toString()).redirect || '/';
        } catch {
          redirect = '/';
        }
      }
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}${redirect}`);
    } catch {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=google`);
    }
  }

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Put('profile')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }

  @Put('change-password')
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }

  @Get('userinfo')
  userInfo(@Req() req: any) {
    return req.user;
  }
}
