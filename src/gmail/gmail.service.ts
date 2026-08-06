import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { RAW_DATA_QUEUE } from '@/queues/queue.constants';
import { RawDataJob } from '@/queues/raw-data.processor';
import { GoogleOidcService } from './google-oidc.service';

@Injectable()
export class GmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleOidcService: GoogleOidcService,
    @InjectQueue(RAW_DATA_QUEUE) private readonly rawDataQueue: Queue<RawDataJob>,
  ) {}

  /**
   * Xử lý push từ Google Pub/Sub.
   * Route này public nhưng bắt buộc verify Google OIDC JWT trước khi xử lý.
   */
  async handleWebhook(authorizationHeader: string | undefined, body: any) {
    if (!authorizationHeader) {
      throw new BadRequestException('Missing Authorization header');
    }
    const [type, token] = authorizationHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new BadRequestException('Invalid Authorization header');
    }

    // Verify Google OIDC JWT.
    const payload = await this.googleOidcService.verifyIdToken(token);

    const message = body?.message;
    if (!message?.data) {
      throw new BadRequestException('Missing message.data');
    }

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const { emailAddress, historyId } = decoded;
    if (!emailAddress || !historyId) {
      throw new BadRequestException('Missing emailAddress or historyId');
    }

    // Push vào Redis (BullMQ) ngay lập tức; processor sẽ lưu vào bảng RawData.
    await this.rawDataQueue.add(
      'gmail-history',
      {
        sourceId: `gmail-history-${historyId}`,
        payload: { emailAddress, historyId, oidcEmail: payload.email },
      },
      {
        jobId: `gmail-history-${historyId}`,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );

    return { received: true, queued: true, historyId, emailAddress };
  }

  async renewWatchIfNeeded() {
    const accounts = await this.prisma.gmailAccount.findMany();
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiring = accounts.filter((a) => a.watchExpiration < soon);
    return { accounts: accounts.length, expiringSoon: expiring.length };
  }
}
