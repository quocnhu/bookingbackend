import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GmailAuthService } from './gmail-auth.provider';
import { GmailWatchService } from './gmail-watch.service';

@Injectable()
export class GmailConnectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: GmailAuthService,
    private readonly watch: GmailWatchService,
  ) {}

  /** OAuth consent URL. Truyền accountId để reconnect (đổi refresh token). */
  buildConnectUrl(accountId?: string): string {
    return this.auth.buildConnectUrl(
      accountId ? { connect: 'gmail', accountId } : { connect: 'gmail' },
    );
  }

  /**
   * Xử lý callback OAuth:
   * - Mới: tạo GmailAccount + register watch.
   * - Reconnect (state.accountId): cập nhật refresh token của account cũ (kéo dài vĩnh viễn).
   */
  async handleCallback(code: string, state?: string) {
    if (!code) throw new BadRequestException('Missing authorization code');

    let accountId: string | undefined;
    if (state) {
      try {
        const parsed = JSON.parse(
          Buffer.from(state, 'base64url').toString('utf-8'),
        );
        accountId = parsed?.accountId;
      } catch {
        /* state có thể không phải JSON */
      }
    }

    const tokens = await this.auth.exchangeCode(code);
    const refreshToken = tokens.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException(
        'No refresh token returned (grant offline access)',
      );
    }

    const gmail = this.auth.getGmailClient(tokens.accessToken);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;
    const historyId = profile.data.historyId;
    if (!email)
      throw new BadRequestException('Could not resolve mailbox email');

    // Chỉ cho phép track đúng mailbox được cấu hình trong GOOGLE_ALLOWED_EMAIL.
    const allowed = process.env.GOOGLE_ALLOWED_EMAIL?.toLowerCase();
    if (allowed && email.toLowerCase() !== allowed) {
      throw new BadRequestException(
        `Mailbox ${email} is not allowed — only ${allowed} can be tracked`,
      );
    }

    let watchExpiration: Date | null = null;
    try {
      watchExpiration = await this.watch.registerWatch(refreshToken);
    } catch (err: any) {
      // Watch có thể fail nếu Pub/Sub push chưa set xong; vẫn lưu account.
      console.warn(`[gmail] watch failed for ${email}:`, err?.message);
    }

    if (accountId) {
      // Reconnect: cập nhật refresh token cho account đã tồn tại.
      const existing = await this.prisma.gmailAccount.findUnique({
        where: { id: accountId },
      });
      if (!existing) throw new NotFoundException('Tracked mailbox not found');
      const account = await this.prisma.gmailAccount.update({
        where: { id: accountId },
        data: {
          refreshToken,
          email,
          lastHistoryId: historyId ? String(historyId) : existing.lastHistoryId,
          ...(watchExpiration ? { watchExpiration } : {}),
        },
      });
      return {
        reconnected: true,
        email: account.email,
        watchExpiration: account.watchExpiration,
      };
    }

    const account = await this.prisma.gmailAccount.upsert({
      where: { email },
      update: {
        refreshToken,
        lastHistoryId: historyId ? String(historyId) : undefined,
        ...(watchExpiration ? { watchExpiration } : {}),
      },
      create: {
        email,
        refreshToken,
        lastHistoryId: historyId ? String(historyId) : '0',
        watchExpiration: watchExpiration ?? new Date(),
      },
    });

    return {
      connected: true,
      email: account.email,
      watchExpiration: account.watchExpiration,
    };
  }

  /** Danh sách mailbox tracked với token masked. */
  async list() {
    const accounts = await this.prisma.gmailAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();
    return accounts.map((a) => ({
      id: a.id,
      email: a.email,
      lastHistoryId: a.lastHistoryId,
      watchExpiration: a.watchExpiration,
      isWatchActive: a.watchExpiration.getTime() > now,
      expiresInDays: Math.max(
        0,
        Math.round((a.watchExpiration.getTime() - now) / 86400000),
      ),
      refreshTokenMasked: this.maskToken(a.refreshToken),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  private maskToken(token: string): string {
    if (!token) return '';
    if (token.length <= 8) return '*'.repeat(token.length);
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  async remove(id: string) {
    const existing = await this.prisma.gmailAccount.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Tracked mailbox not found');
    await this.prisma.gmailAccount.delete({ where: { id } });
    return { success: true };
  }
}
