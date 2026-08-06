import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Booking, BookingProvider, BookingStatus, PaymentStatus, Prisma, TourType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import { BookingNormalizerService, CleanBookingData } from './booking-normalizer.service';
import { ASSIGNMENT_JOB, ASSIGNMENT_QUEUE } from './queue.constants';

export type WriteResult =
  | { status: 'SKIPPED'; reason: string; booking?: undefined }
  | { status: 'PROCESSED'; booking?: Booking | null };

@Injectable()
export class BookingWriterService {
  private readonly logger = new Logger(BookingWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly normalizer: BookingNormalizerService,
    @InjectQueue(ASSIGNMENT_QUEUE) private readonly assignmentQueue: Queue,
  ) {}

  /**
   * Pipeline mail: RawData -> JSON sạch -> Booking -> Assignment queue.
   */
  async writeFromRawData(rawDataId: string): Promise<WriteResult> {
    const raw = await this.prisma.rawData.findUnique({ where: { id: rawDataId } });
    if (!raw) {
      return { status: 'SKIPPED', reason: 'RAW_DATA_NOT_FOUND' };
    }

    const payload = raw.payload as Prisma.JsonObject;
    const result = this.normalizer.normalize(payload);

    if (!result.clean || !result.data || result.data.action === 'SKIP') {
      await this.prisma.rawData.update({
        where: { id: rawDataId },
        data: {
          status: 'PROCESSED',
          payload: { ...payload, clean: false, reason: result.reason ?? 'SKIPPED' } as Prisma.InputJsonValue,
        },
      });
      return { status: 'SKIPPED', reason: result.reason ?? 'SKIPPED' };
    }

    const booking = await this.upsertBooking(result.data, rawDataId);

    await this.prisma.rawData.update({
      where: { id: rawDataId },
      data: {
        status: 'PROCESSED',
        payload: {
          ...payload,
          clean: true,
          booking: result.data,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    if (booking && result.data.action !== 'CANCEL') {
      await this.enqueueAssignment(booking.id);
    }

    return { status: 'PROCESSED', booking };
  }

  /**
   * Tạo booking thủ công (queue riêng `booking-manual`), vẫn đẩy sang assignment.
   */  async createManual(data: Record<string, any>, actorId?: string): Promise<Booking> {
    const existing = await this.prisma.booking.findUnique({ where: { bookingRef: data.bookingRef } });
    if (existing) throw new ConflictException('Booking reference already exists');

    const clean: CleanBookingData = {
      action: 'CREATE',
      bookingRef: data.bookingRef,
      channel: (data.channel as BookingProvider) ?? BookingProvider.MANUAL,
      ...data,
    };
    const booking = await this.upsertBooking(clean, undefined, actorId);
    await this.enqueueAssignment(booking.id);
    return booking;
  }

  /**
   * Upsert theo bookingRef (idempotent): mail modify -> update, mới -> create.
   */
  async upsertBooking(data: CleanBookingData, rawDataId?: string, actorId?: string): Promise<Booking> {
    const bookingRef = data.bookingRef!;
    const existing = await this.prisma.booking.findUnique({ where: { bookingRef } });

    const bookingData: {
      bookingRef: string;
      channel: BookingProvider;
      status: BookingStatus;
      tourId?: string;
      tourName?: string;
      tourType?: TourType;
      address?: string;
      latitude?: number;
      longitude?: number;
      startingDate?: Date;
      customerName?: string;
      hotelName?: string;
      phone?: string;
      mail?: string;
      totalPax?: number;
      paxDetail?: string;
      payment?: PaymentStatus;
      isNoShow?: boolean;
      noShowReason?: string;
      rawDataId?: string;
    } = {
      bookingRef,
      channel: data.channel ?? BookingProvider.WEBSITE,
      status: data.action === 'CANCEL' ? BookingStatus.CANCELED : BookingStatus.PENDING,
      tourId: data.tourId,
      tourName: data.tourName,
      tourType: data.tourType,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      startingDate: data.startingDate ? new Date(data.startingDate) : undefined,
      customerName: data.customerName,
      hotelName: data.hotelName,
      phone: data.phone,
      mail: data.mail,
      totalPax: data.totalPax ?? 0,
      paxDetail: data.paxDetail,
      payment: data.payment,
      isNoShow: data.isNoShow,
      noShowReason: data.noShowReason,
      rawDataId: existing?.rawDataId ?? rawDataId,
    };

    if (existing) {
      const booking = await this.prisma.booking.update({
        where: { bookingRef },
        data: { ...bookingData, rawDataId: existing.rawDataId ?? rawDataId },
      });
      await this.auditService.log({
        entityType: 'Booking',
        entityId: booking.id,
        action: 'UPSERT_EMAIL',
        beforeData: { bookingRef },
        afterData: booking,
        changedBy: actorId ?? null,
      });
      return booking;
    }

    const booking = await this.prisma.booking.create({ data: bookingData });
    await this.auditService.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'CREATE_EMAIL',
      afterData: booking,
      changedBy: actorId ?? null,
    });
    return booking;
  }

  private async enqueueAssignment(bookingId: string) {
    await this.assignmentQueue.add(
      ASSIGNMENT_JOB,
      { bookingId },
      {
        jobId: `assign-${bookingId}`,
        removeOnComplete: 1000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }
}
