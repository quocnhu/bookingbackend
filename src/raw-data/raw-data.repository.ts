import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Thin wrapper around the rawData table — the immutable source of truth.
 * Every pipeline read/write operation goes through this repository.
 */
@Injectable()
export class RawDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    sourceId: string;
    email?: string;
    templateTag?: string;
    payloadHash?: string;
    payload: Prisma.InputJsonValue;
  }) {
    return this.prisma.rawData.create({
      data: {
        sourceId: data.sourceId,
        email: data.email,
        templateTag: data.templateTag,
        payloadHash: data.payloadHash,
        payload: data.payload,
        status: 'pending',
      },
    });
  }

  findById(id: string) {
    return this.prisma.rawData.findUnique({ where: { id } });
  }

  findBySourceId(sourceId: string) {
    return this.prisma.rawData.findUnique({ where: { sourceId } });
  }

  updateStatus(
    id: string,
    status: string,
    extra: Prisma.RawDataUpdateInput = {},
  ) {
    return this.prisma.rawData.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  /** Update the payload enriched by the parser (e.g. payload.booking). */
  updatePayload(id: string, payload: Prisma.InputJsonValue) {
    return this.prisma.rawData.update({
      where: { id },
      data: { payload },
    });
  }

  /**
   * Link the raw email to the booking it produced, and record WHAT it was.
   *
   * `action`  — what the email is: CREATE | MODIFY | CANCEL
   * `outcome` — what the system did: CREATED | UPDATED | CANCELLED |
   *             UNCHANGED | SKIPPED
   *
   * Two links are written:
   *  - `linkedBooking` — always: the booking this email is about;
   *  - `booking` (the origin) — only when the email CREATED the booking, so
   *    a later amendment never steals the origin link.
   */
  markParsed(
    id: string,
    bookingId: string,
    action?: string | null,
    outcome?: string | null,
  ) {
    return this.prisma.rawData.update({
      where: { id },
      data: {
        status: 'parsed',
        action: action ?? undefined,
        outcome: outcome ?? undefined,
        linkedBooking: { connect: { id: bookingId } },
        ...(outcome === 'CREATED'
          ? { booking: { connect: { id: bookingId } } }
          : {}),
      },
    });
  }

  countByStatus(status: string) {
    return this.prisma.rawData.count({ where: { status } });
  }

  /** Count the rows per distinct value of a column (action / outcome). */
  async countByField(field: 'action' | 'outcome') {
    const rows = await this.prisma.rawData.groupBy({
      by: [field],
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const value = row[field] as string | null;
      if (value) counts[value] = row._count._all;
    }
    return counts;
  }
}
