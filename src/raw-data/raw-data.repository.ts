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

  /** Link rawData → booking after a successful parse (so it can be replayed). */
  markParsed(id: string, bookingId: string) {
    return this.prisma.rawData.update({
      where: { id },
      data: { status: 'parsed', booking: { connect: { id: bookingId } } },
    });
  }

  countByStatus(status: string) {
    return this.prisma.rawData.count({ where: { status } });
  }
}
