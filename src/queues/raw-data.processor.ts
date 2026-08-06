import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RAW_DATA_QUEUE } from './queue.constants';

export interface RawDataJob {
  sourceId: string;
  payload: Prisma.InputJsonValue;
  status?: string;
}

@Injectable()
@Processor(RAW_DATA_QUEUE)
export class RawDataProcessor extends WorkerHost {
  private readonly logger = new Logger(RawDataProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<RawDataJob>) {
    const { sourceId, payload, status = 'PENDING' } = job.data;
    try {
      const saved = await this.prisma.rawData.create({
        data: { sourceId, payload, status },
      });
      this.logger.log(`Saved rawData ${saved.id} for ${sourceId}`);
      return { saved: true, id: saved.id };
    } catch (error) {
      this.logger.error(`Failed to save rawData for ${sourceId}`, error as Error);
      throw error;
    }
  }
}
