import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Thin wrapper quanh bảng rawData — nguồn sự thật bất biến (source of truth).
 * Mọi thao tác ghi/đọc pipeline đều đi qua repository này.
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

  /** Cập nhật payload đã được parser làm giàu (vd payload.booking). */
  updatePayload(id: string, payload: Prisma.InputJsonValue) {
    return this.prisma.rawData.update({
      where: { id },
      data: { payload },
    });
  }

  /** Nối rawData → booking sau khi parse thành công (giúp replay được). */
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
