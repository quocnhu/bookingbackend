import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RawDataRepository } from './raw-data.repository';
import { RAW_DATA_STATUS, RawDataStatus } from './raw-data.entity';

/**
 * Business service for rawData: creates records from ingestion and
 * transitions state from the parsing worker.
 */
@Injectable()
export class RawDataService {
  private readonly logger = new Logger(RawDataService.name);

  constructor(private readonly repository: RawDataRepository) {}

  async createIngested(input: {
    sourceId: string;
    email: string;
    templateTag: string;
    payload: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const existing = await this.repository.findBySourceId(input.sourceId);
    if (existing) return { id: existing.id };

    const payloadHash = this.hashPayload(input.payload);
    const raw = await this.repository.create({
      sourceId: input.sourceId,
      email: input.email,
      templateTag: input.templateTag,
      payloadHash,
      payload: input.payload as Prisma.InputJsonValue,
    });
    this.logger.log(
      `Saved rawData ${raw.id} (${input.templateTag}) for ${input.sourceId}`,
    );
    return { id: raw.id };
  }

  async markUnparsed(id: string) {
    await this.repository.updateStatus(id, RAW_DATA_STATUS.UNPARSED);
    this.logger.log(`rawData ${id} -> unparsed (manual review)`);
  }

  async markParseFailed(id: string, reason: string) {
    await this.appendReason(id, reason);
  }

  async markParsed(id: string, bookingId: string) {
    await this.repository.markParsed(id, bookingId);
  }

  /** Persist the payload after the parser enriches it (payload.booking). */
  async updatePayload(id: string, payload: Record<string, unknown>) {
    await this.repository.updatePayload(id, payload as Prisma.InputJsonValue);
  }

  private async appendReason(id: string, reason: string) {
    const raw = await this.repository.findById(id);
    if (!raw) return;
    const payload = (raw.payload ?? {}) as Record<string, unknown>;
    await this.repository.updateStatus(id, RAW_DATA_STATUS.PARSE_FAILED, {
      payload: { ...payload, parseError: reason },
    });
  }

  private hashPayload(payload: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async summary() {
    const statuses: RawDataStatus[] = [
      RAW_DATA_STATUS.PENDING,
      RAW_DATA_STATUS.PARSED,
      RAW_DATA_STATUS.UNPARSED,
      RAW_DATA_STATUS.PARSE_FAILED,
    ];
    const counts: Record<string, number> = {};
    for (const s of statuses)
      counts[s] = await this.repository.countByStatus(s);
    return counts;
  }
}
