import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/audit/audit.service';
import {
  AssignBookingsDto,
  CreateAssignmentDto,
  FinalizeAssignmentDto,
  QueryAssignmentDto,
  SubmitTourReportDto,
  UpdateAssignmentDto,
  UpdateAssignmentStatusDto,
  VerifyTourReportDto,
} from './dto/assignment.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AssignmentOrigin, AssignmentStatus, BookingStatus, FeeFlowType, GuideType, NotificationType, RoleType } from '@prisma/client';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { AssignmentBoardService } from '@/queues/assignment-board.service';
import { NotificationService } from '@/notifications/notification.service';
import { NotificationsGateway } from '@/notifications/notifications.gateway';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly board: AssignmentBoardService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationsGateway,
  ) {}

  private include = {
    bookings: {
      orderBy: { paxSequence: 'asc' as const },
      include: {
        settlements: true,
        tour: { select: { adultPrice: true } },
        movedFromBus: {
          select: {
            code: true,
            vehicle: { select: { plateNumber: true } },
          },
        },
      },
    },
    vehicle: true,
    provider: true,
    driver: { select: { id: true, name: true, email: true } },
    guide: { select: { id: true, name: true, email: true } },
    reportVerifier: { select: { id: true, name: true, email: true } },
    settlements: true,
    tourReport: true,
  };

  async findBoard(actor: AuthenticatedUser) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const where: any = {
      status: { notIn: [AssignmentStatus.CANCELED, AssignmentStatus.COMPLETED] },
      // Today + upcoming only: a tour is still "live" while its endDate is today or later.
      endDate: { gte: startOfToday },
    };
    if (actor.role !== RoleType.ADMIN && actor.role !== RoleType.OFFICE) {
      where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
    }

    const items = await this.prisma.assignment.findMany({
      where,
      include: this.include,
      orderBy: [{ startDate: 'asc' }],
    });

    return items.map((a) => {
      const card = this.decorateBoardCard(a);
      delete card.pickupInfo;
      delete card.pickups;
      delete card.latitude;
      delete card.longitude;
      return card;
    });
  }

  /** Dispatch (xuất bến) toàn bộ chuyến PENDING trên Dispatch Board. */
  async dispatchAllBoard(): Promise<{ dispatched: number }> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const items = await this.prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.PENDING,
        endDate: { gte: startOfToday },
      },
      select: { id: true },
    });
    if (items.length === 0) return { dispatched: 0 };

    const ids = items.map((a) => a.id);
    await this.prisma.$transaction([
      this.prisma.assignment.updateMany({
        where: { id: { in: ids } },
        data: { status: AssignmentStatus.DISPATCHED },
      }),
      this.prisma.booking.updateMany({
        where: { assignmentId: { in: ids }, status: BookingStatus.PENDING },
        data: { status: BookingStatus.ASSIGNED },
      }),
    ]);

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: items.map((a) => a.id).join(','),
      action: 'DISPATCH_ALL',
      afterData: { count: items.length },
    });
    return { dispatched: items.length };
  }

  /** Đổi nguồn tạo (Manual/Auto) cho toàn bộ chuyến đang có trên Dispatch Board. */
  async setBoardOrigin(origin: AssignmentOrigin) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const result = await this.prisma.assignment.updateMany({
      where: {
        status: { not: AssignmentStatus.CANCELED },
        endDate: { gte: startOfToday },
      },
      data: { origin },
    });
    return { updated: result.count };
  }

  /** Tính các thông tin hiển thị trên Dispatch Board cho 1 assignment. */
  private decorateBoardCard(a: any) {
    const totalPax =
      a.totalPax ??
      a.bookings.reduce((sum: number, b: any) => sum + (b.totalPax ?? 0), 0);
    const type = a.tourType ?? a.bookings.find((b) => b.tourType)?.tourType ?? null;
    const tourName =
      a.tourName ?? a.bookings.find((b) => b.tourName)?.tourName ?? a.code ?? 'Tour';
    const durationDays =
      a.durationDays ??
      (a.endDate && a.startDate
        ? Math.max(
            1,
            Math.round((a.endDate.getTime() - a.startDate.getTime()) / 86400000) + 1,
          )
        : 1);
    const pickups = Array.isArray(a.pickupInfo)
      ? (a.pickupInfo as Array<Record<string, unknown>>)
      : a.bookings
          .filter((b) => b.hotelName || b.address)
          .map((b) => ({
            bookingRef: b.bookingRef,
            customerName: b.customerName,
            pickup: b.hotelName || b.address,
            totalPax: b.totalPax ?? 0,
          }));
    return { ...a, totalPax, tourType: type, tourName, durationDays, pickups };
  }

  async findAll(query: QueryAssignmentDto, actor: AuthenticatedUser): Promise<PaginatedResult<any>> {
    const { page, limit, status, vehicleId, driverId, guideId, sortOrder } = query;
    const where: any = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    if (driverId) where.driverId = driverId;
    if (guideId) where.guideId = guideId;
    if (actor.role !== RoleType.ADMIN && actor.role !== RoleType.OFFICE) {
      where.OR = [{ driverId: actor.id }, { guideId: actor.id }];
    }

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        include: this.include,
        orderBy: [{ startDate: sortOrder ?? 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assignment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: this.include,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(dto: CreateAssignmentDto, actor?: AuthenticatedUser) {
    const assignment = await this.prisma.assignment.create({
      data: {
        code: dto.code,
        tourName: dto.tourName,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        vehicleId: dto.vehicleId,
        providerId: dto.providerId,
        driverId: dto.driverId,
        guideId: dto.guideId,
        status: dto.status,
        sequenceIndex: dto.sequenceIndex,
        priceOverride: dto.priceOverride,
        tripNotes: dto.tripNotes,
        createdWho: actor?.name ?? actor?.email ?? 'System',
      },
    });
    await this.auditService.log({
      entityType: 'Assignment',
      entityId: assignment.id,
      action: 'CREATE',
      afterData: assignment,
    });
    return this.findOne(assignment.id);
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    const before = await this.findOne(id);
    const assignment = await this.prisma.assignment.update({
      where: { id },
      data: {
        code: dto.code,
        tourName: dto.tourName,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        vehicleId: dto.vehicleId,
        providerId: dto.providerId,
        driverId: dto.driverId,
        guideId: dto.guideId,
        status: dto.status,
        sequenceIndex: dto.sequenceIndex,
        priceOverride: dto.priceOverride,
        tripNotes: dto.tripNotes,
      },
    });
    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: assignment,
    });
    return this.findOne(id);
  }

  async updateStatus(id: string, dto: UpdateAssignmentStatusDto) {
    const before = await this.findOne(id);
    if (dto.status === before.status) return before;

    // ── Guard: COMPLETED requires a verified TourReport ──
    if (dto.status === AssignmentStatus.COMPLETED) {
      const report = await this.prisma.tourReport.findUnique({ where: { assignmentId: id } });
      if (!report || report.status !== 'VERIFIED') {
        throw new BadRequestException(
          'Cannot mark COMPLETED without a verified tour report. Guide must submit → Admin verifies → Then mark COMPLETED.',
        );
      }
    }

    // Chuyển trạng thái booking tương ứng.
    if (dto.status === AssignmentStatus.DISPATCHED) {
      await this.prisma.booking.updateMany({
        where: { assignmentId: id, status: BookingStatus.PENDING },
        data: { status: BookingStatus.ASSIGNED },
      });
    } else if (dto.status === AssignmentStatus.CANCELED) {
      await this.prisma.booking.updateMany({
        where: { assignmentId: id, status: BookingStatus.ASSIGNED },
        data: { status: BookingStatus.PENDING, assignmentId: null },
      });
    }

    const assignment = await this.prisma.assignment.update({
      where: { id },
      data: { status: dto.status },
      include: this.include,
    });

    // Khi chuyến rời bến (DISPATCHED) ta vẫn chưa kích hoạt settlement.
    // Settlement chỉ được kích hoạt sau khi kế toán xác minh (COMPLETED).

    // ── Fire notifications + WebSocket ──
    const affectedUserIds = [assignment.driverId, assignment.guideId].filter(Boolean) as string[];
    const notifResult = await this.sendStatusNotifications(assignment, before.status, dto.status);

    this.gateway.broadcastAssignmentChange(id, dto.status, affectedUserIds);

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: `UPDATE_STATUS:${dto.status}`,
      beforeData: { status: before.status },
      afterData: { status: dto.status },
    });
    return this.findOne(id);
  }

  /**
   * Kích hoạt Settlement cho chuyến xe (Lớp 2) và từng booking (Lớp 1).
   *
   * Lớp 1 — mỗi booking trong chuyến được tạo 1 khoản "Thu hộ COD" (COLLECT_MONEY)
   *         để giao diện hiển thị biểu tượng thu tiền từ khách của từng booking.
   * Lớp 2 — nếu chuyến có nhà xe (provider), tạo 1 khoản "Phí xe" (PAY_MONEY) trả cho nhà xe.
   */
  private async ensureSettlement(assignment: any) {
    const collectCategory = await this.prisma.settlementCategory.findUnique({
      where: { code: 'COLLECT_ON_BEHALF' },
    });
    const vehicleCategory = await this.prisma.settlementCategory.findUnique({
      where: { code: 'VEHICLE_FEE' },
    });

    // Người tạo mặc định: HDV của chuyến, nếu không có thì bỏ qua (createdById là bắt buộc).
    const createdById = assignment.guideId ?? assignment.driverId ?? null;
    if (!createdById) return;

    // Lớp 1: tạo khoản thu hộ cho từng booking chưa có settlement.
    const bookings = assignment.bookings ?? [];
    for (const b of bookings) {
      const hasSettlement = await this.prisma.settlement.findFirst({
        where: { bookingId: b.id },
      });
      if (hasSettlement) continue;
      const amount = Number(b.tour?.adultPrice ?? 0) > 0 ? Number(b.tour.adultPrice) : 0;
      await this.prisma.settlement.create({
        data: {
          amount,
          note: `Thu hộ COD — ${b.customerName ?? b.bookingRef ?? 'khách'}`,
          bookingId: b.id,
          assignmentId: assignment.id,
          categoryId: collectCategory?.id,
          createdById,
        },
      });
    }

    // Lớp 2: khoản chi trả nhà xe cho chuyến.
    if (assignment.providerId) {
      const hasVehicleSettlement = await this.prisma.settlement.findFirst({
        where: { assignmentId: assignment.id, categoryId: vehicleCategory?.id },
      });
      if (!hasVehicleSettlement) {
        await this.prisma.settlement.create({
          data: {
            amount: Number(assignment.priceOverride ?? 0),
            note: `Phí xe — ${assignment.code ?? 'Bus'}`,
            assignmentId: assignment.id,
            categoryId: vehicleCategory?.id,
            createdById,
          },
        });
      }
    }
  }

  private async sendStatusNotifications(assignment: any, fromStatus: string, toStatus: string) {
    const code = assignment.code ?? 'Bus';
    const tour = assignment.tourName ?? '';
    const affectedUserIds = [assignment.driverId, assignment.guideId].filter(Boolean) as string[];
    const result: any[] = [];

    for (const userId of affectedUserIds) {
      let type: NotificationType;
      let title: string;
      let body: string;

      switch (toStatus) {
        case AssignmentStatus.DISPATCHED:
          type = NotificationType.ASSIGNED;
          title = `🚌 ${code} xuất bến`;
          body = `Chuyến ${tour} đã bắt đầu. Vui lòng lên xe.`;
          break;
        case AssignmentStatus.TRANSFERRED:
          type = NotificationType.TRANSFERRED;
          title = `🔄 ${code} — Đã thay đổi`;
          body = `Chuyến ${tour} đã được đổi xe/vị trí. Kiểm tra lịch đón mới.`;
          break;
        case AssignmentStatus.VERIFYING:
          type = NotificationType.GENERAL;
          title = `⏳ ${code} — Đang chờ xác minh`;
          body = `Báo cáo chuyến ${tour} đã nộp. Chờ Admin/Kế toán xác minh.`;
          break;
        case AssignmentStatus.CANCELED:
          type = NotificationType.CANCELED;
          title = `❌ ${code} — Đã hủy`;
          body = `Chuyến ${tour} đã bị hủy. Khách đã được gỡ khỏi lịch.`;
          break;
        case AssignmentStatus.COMPLETED:
          type = NotificationType.GENERAL;
          title = `✅ ${code} — Hoàn thành`;
          body = `Chuyến ${tour} đã kết thúc.`;
          break;
        case AssignmentStatus.DRAFT_ASSIGNED:
          type = NotificationType.ASSIGNED;
          title = `📋 ${code} — Đã gán draft`;
          body = `Chuyến ${tour} đã được xếp xe. Đang chờ xác nhận.`;
          break;
        default:
          type = NotificationType.GENERAL;
          title = `${code} — Cập nhật trạng thái`;
          body = `Trạng thái chuyển: ${fromStatus} → ${toStatus}`;
      }

      const notif = await this.notificationService.create(userId, type, title, body, {
        assignmentId: assignment.id,
        fromStatus,
        toStatus,
      });
      result.push(notif);
      this.gateway.notifyUser(userId, 'notification', notif);
    }
    return result;
  }

  async assignBookings(id: string, dto: AssignBookingsDto) {
    const assignment = await this.findOne(id);
    const existing = await this.prisma.booking.findMany({
      where: { id: { in: dto.bookingIds } },
      select: { id: true, assignmentId: true },
    });
    const busy = existing.find((b) => b.assignmentId && b.assignmentId !== id);
    if (busy) {
      throw new BadRequestException(`Booking ${busy.id} is already assigned to another assignment`);
    }

    const maxSeq = await this.prisma.booking.aggregate({
      where: { assignmentId: id },
      _max: { paxSequence: true },
    });

    await this.prisma.$transaction(
      dto.bookingIds.map((bookingId, i) =>
        this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            assignmentId: id,
            paxSequence: (maxSeq._max.paxSequence ?? 0) + i + 1,
            status: BookingStatus.ASSIGNED,
          },
        }),
      ),
    );

    await this.refreshSummary(id);

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'ASSIGN_BOOKINGS',
      afterData: { bookingIds: dto.bookingIds },
    });
    return this.findOne(id);
  }

  async removeBooking(id: string, bookingId: string) {
    await this.findOne(id);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.assignmentId !== id) {
      throw new NotFoundException('Booking not in this assignment');
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { assignmentId: null, paxSequence: 0, status: BookingStatus.PENDING },
    });
    await this.refreshSummary(id);
    return this.findOne(id);
  }

  // ─── Drag & drop trên Dispatch Board ──────────────────────────────────
  /** Xếp lại thứ tự khách trong bus theo thứ tự kéo-thả của admin. */
  async reorderBookings(id: string, bookingIds: string[]) {
    const result = await this.board.reorder(id, bookingIds);
    if (result.error) throw new BadRequestException(result.error);
    return this.findOne(id);
  }

  /** Kéo-thả booking từ bus này sang bus khác. */
  async moveBooking(
    fromAssignmentId: string,
    bookingId: string,
    toAssignmentId: string,
  ) {
    const result = await this.board.move(
      fromAssignmentId,
      bookingId,
      toAssignmentId,
    );
    if (result.error) throw new BadRequestException(result.error);
    // Lưu bằng chứng nguồn gốc: bus mà khách này đã bị chuyển ra → giữ màu đỏ trên board.
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { movedFromBusId: fromAssignmentId },
    });
    await this.notifyMoveBooking(
      fromAssignmentId,
      toAssignmentId,
      bookingId,
    );
    return this.findOne(toAssignmentId);
  }

  /** Gửi thông báo cho HDV 2 đầu (bus đi & bus đến) khi kéo-thả khách giữa 2 bus. */
  private async notifyMoveBooking(
    fromAssignmentId: string,
    toAssignmentId: string,
    bookingId: string,
  ) {
    const [from, to, booking] = await Promise.all([
      this.prisma.assignment.findUnique({
        where: { id: fromAssignmentId },
        select: { code: true, tourName: true, guideId: true },
      }),
      this.prisma.assignment.findUnique({
        where: { id: toAssignmentId },
        select: { code: true, tourName: true, guideId: true },
      }),
      this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { bookingRef: true, customerName: true },
      }),
    ]);
    const guest = `${booking?.customerName ?? 'Khách'}${booking?.bookingRef ? ` (${booking.bookingRef})` : ''}`;
    const recipients: { id: string | null | undefined; body: string }[] = [
      {
        id: from?.guideId,
        body: `Booking ${guest} đã được chuyển khỏi xe ${from?.code ?? ''} của bạn.`,
      },
      {
        id: to?.guideId,
        body: `Booking ${guest} mới được chuyển vào xe ${to?.code ?? ''} của bạn. Kiểm tra danh sách khách trước khi xuất bến.`,
      },
    ];
    for (const r of recipients) {
      if (!r.id) continue;
      const notif = await this.notificationService.create(
        r.id,
        NotificationType.TRANSFERRED,
        `🔄 ${to?.code ?? 'Xe'} — Khách thay đổi`,
        r.body,
        { bookingId, fromAssignmentId, toAssignmentId },
      );
      this.gateway.notifyUser(r.id, 'notification', notif);
    }
  }

  /**
   * Tổng hợp lại thông tin quan trọng của assignment (tourName/tourType/durationDays/
   * pickupInfo) từ các booking hiện có — gọi sau khi thêm/bớt booking.
   */
  private async refreshSummary(assignmentId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { assignmentId },
      include: { tour: { select: { durationDays: true, type: true, name: true } } },
    });

    // Resolve toạ độ còn thiếu từ bảng Coordinate (theo hotelName hoặc address).
    for (const b of bookings) {
      if (b.latitude != null && b.longitude != null) continue;
      const key = b.hotelName ?? b.address;
      if (!key) continue;
      const match = await this.prisma.coordinate.findFirst({
        where: {
          OR: [
            { hotelName: { equals: key, mode: 'insensitive' } },
            { address: { equals: key, mode: 'insensitive' } },
          ],
        },
      });
      if (!match) continue;
      await this.prisma.booking.update({
        where: { id: b.id },
        data: {
          latitude: match.latitude,
          longitude: match.longitude,
          address: b.address ?? match.address,
        },
      });
      b.latitude = match.latitude;
      b.longitude = match.longitude;
    }

    const first = bookings[0];
    const tourName =
      bookings.find((b) => b.tourName)?.tourName ??
      first?.tour?.name ??
      undefined;
    const tourType =
      bookings.find((b) => b.tourType)?.tourType ??
      first?.tour?.type ??
      undefined;
    const durationDays = first?.tour?.durationDays ?? 1;
    const totalPax = bookings.reduce((sum, b) => sum + (b.totalPax ?? 0), 0);

    // Centroid các điểm đón có toạ độ → trung tâm bản đồ cho cả chuyến.
    const geo = bookings.filter(
      (b) => b.latitude != null && b.longitude != null,
    );
    const latitude =
      geo.length > 0
        ? geo.reduce((s, b) => s + b.latitude!, 0) / geo.length
        : null;
    const longitude =
      geo.length > 0
        ? geo.reduce((s, b) => s + b.longitude!, 0) / geo.length
        : null;

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { tourName, tourType, durationDays, totalPax, latitude, longitude },
    });
  }

  // ─── Tour Report: HDV nộp báo cáo → kế toán xác minh → Tour COMPLETED ──

  /**
   * HDV (hoặc OFFICE thay mặt) nộp báo cáo tour sau khi kết thúc chuyến.
   * Assignment giữ trạng thái DISPATCHED cho tới khi kế toán xác minh.
   */
  async submitTourReport(
    id: string,
    dto: SubmitTourReportDto,
    actor: AuthenticatedUser,
  ) {
    const assignment = await this.findOne(id);
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new BadRequestException('Tour already completed');
    }
    if (assignment.status === AssignmentStatus.CANCELED) {
      throw new BadRequestException('Canceled assignment cannot submit a report');
    }
    if (
      actor.role !== RoleType.ADMIN &&
      actor.role !== RoleType.OFFICE &&
      assignment.guideId !== actor.id
    ) {
      throw new BadRequestException(
        'Only the assigned tour guide or office staff can submit the tour report',
      );
    }

    const report = await this.prisma.tourReport.upsert({
      where: { assignmentId: id },
      update: {
        submittedById: actor.id,
        submittedByName: actor.name,
        submittedAt: new Date(),
        actualPax: dto.actualPax,
        pickupNotes: dto.pickupNotes,
        distanceKm: dto.distanceKm,
        fuelCost: dto.fuelCost,
        tollParking: dto.tollParking,
        notes: dto.notes,
        status: 'SUBMITTED',
        verifiedById: null,
        verifiedByName: null,
        verifiedAt: null,
        verificationNotes: null,
      },
      create: {
        assignmentId: id,
        submittedById: actor.id,
        submittedByName: actor.name,
        actualPax: dto.actualPax,
        pickupNotes: dto.pickupNotes,
        distanceKm: dto.distanceKm,
        fuelCost: dto.fuelCost,
        tollParking: dto.tollParking,
        notes: dto.notes,
        status: 'SUBMITTED',
      },
    });

    // Sau khi HDV submit → chuyển chuyến sang VERIFYING để "chờ Admin/Kế toán xác minh".
    // (Fake progress: giao diện hiển thị trạng thái đang chờ xác minh.)
    if (assignment.status === AssignmentStatus.DISPATCHED) {
      await this.prisma.assignment.update({
        where: { id },
        data: { status: AssignmentStatus.VERIFYING },
      });
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'SUBMIT_TOUR_REPORT',
      afterData: { reportId: report.id, submittedByName: actor.name },
      changedBy: actor.id,
    });

    return report;
  }

  /**
   * Bộ phận kế toán/quản lý xác minh báo cáo.
   * VERIFIED → Tour COMPLETED + kích hoạt Settlement.
   * REJECTED → tour giữ DISPATCHED để HDV gửi lại.
   */
  async verifyTourReport(
    id: string,
    dto: VerifyTourReportDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.role !== RoleType.ADMIN && actor.role !== RoleType.OFFICE) {
      throw new BadRequestException(
        'Only accounting/management (ADMIN/OFFICE) can verify tour reports',
      );
    }

    const assignment = await this.findOne(id);
    const report = await this.prisma.tourReport.findUnique({
      where: { assignmentId: id },
    });
    if (!report) {
      throw new NotFoundException('No tour report submitted for this assignment');
    }
    if (report.status === 'VERIFIED') {
      throw new BadRequestException('Tour report already verified');
    }

    const updated = await this.prisma.tourReport.update({
      where: { id: report.id },
      data: {
        status: dto.status,
        verifiedById: actor.id,
        verifiedByName: actor.name,
        verifiedAt: new Date(),
        verificationNotes: dto.verificationNotes,
      },
    });

    if (dto.status === 'VERIFIED' && assignment.status !== AssignmentStatus.COMPLETED) {
      const completed = await this.prisma.assignment.update({
        where: { id },
        data: { status: AssignmentStatus.COMPLETED },
        include: this.include,
      });
      await this.ensureSettlement(completed);
    }

    // ── Notify guide about report verification ──
    if (assignment.guideId) {
      const isVerified = dto.status === 'VERIFIED';
      const notifType = isVerified ? NotificationType.REPORT_VERIFIED : NotificationType.REPORT_REJECTED;
      const title = isVerified
        ? `✅ Báo cáo "${assignment.code}" đã được xác nhận`
        : `❌ Báo cáo "${assignment.code}" bị từ chối`;
      const body = isVerified
        ? `Báo cáo tour ${assignment.tourName ?? ''} đã được kế toán xác nhận.`
        : `Báo cáo tour ${assignment.tourName ?? ''} bị từ chối. ${dto.verificationNotes ?? ''}`;
      const notif = await this.notificationService.create(assignment.guideId, notifType, title, body, {
        assignmentId: id,
        reportStatus: dto.status,
      });
      this.gateway.notifyUser(assignment.guideId, 'notification', notif);
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: `VERIFY_TOUR_REPORT:${dto.status}`,
      beforeData: { reportStatus: report.status },
      afterData: { reportId: updated.id, verifiedByName: actor.name },
      changedBy: actor.id,
    });

    return this.findOne(id);
  }

  /**
   * Quyết toán chuyến — "Confirm finished".
   * net = collectedAmount - servicesTotal.
   * net >= 0 → COLLECT_MONEY (HDV nộp lại cho công ty).
   * net < 0  → PAY_MONEY (công ty hoàn trả |net| cho HDV).
   * Kết quả lưu vào TourReport kèm tên thật của người thực hiện (admin/kế toán/HDV).
   */
  async finalize(id: string, dto: FinalizeAssignmentDto, actor: AuthenticatedUser) {
    const assignment = await this.findOne(id);
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new BadRequestException('Tour already completed');
    }
    if (assignment.status === AssignmentStatus.CANCELED) {
      throw new BadRequestException('Canceled assignment cannot be settled');
    }

    const collectedAmount = Number(dto.collectedAmount ?? 0);
    const services = (dto.services ?? [])
      .filter((s) => Number(s.amount) > 0)
      .map((s) => ({
        categoryId: s.categoryId ?? null,
        name: s.name,
        amount: Number(s.amount),
      }));
    const servicesTotal = services.reduce((sum, s) => sum + s.amount, 0);
    const netAmount = collectedAmount - servicesTotal;
    const settlementFlow: FeeFlowType =
      netAmount >= 0 ? FeeFlowType.COLLECT_MONEY : FeeFlowType.PAY_MONEY;

    await this.prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id },
        data: { status: AssignmentStatus.COMPLETED },
      });
      const data = {
        collectedAmount,
        services,
        servicesTotal,
        netAmount,
        settlementFlow,
        finalizedById: actor.id,
        finalizedByName: actor.name,
        finalizedAt: new Date(),
      };
      await tx.tourReport.upsert({
        where: { assignmentId: id },
        update: data,
        create: { assignmentId: id, ...data },
      });
    });

    // Đảm bảo các khoản thu hộ COD (Lớp 1) theo từng booking đã tồn tại.
    const withBookings = await this.prisma.assignment.findUniqueOrThrow({
      where: { id },
      include: this.include,
    });
    await this.ensureSettlement(withBookings);

    // Thông báo cho HDV kết quả quyết toán.
    if (withBookings.guideId) {
      const flowText =
        settlementFlow === FeeFlowType.COLLECT_MONEY
          ? `Nộp lại công ty $${netAmount.toLocaleString('en-US')}`
          : `Công ty hoàn trả $${Math.abs(netAmount).toLocaleString('en-US')}`;
      const notif = await this.notificationService.create(
        withBookings.guideId,
        NotificationType.REPORT_VERIFIED,
        `✅ Chuyến "${withBookings.code ?? 'Bus'}" đã được quyết toán`,
        `${withBookings.tourName ?? 'Tour'} — ${flowText}. Người thực hiện: ${actor.name ?? '—'}`,
        { assignmentId: id },
      );
      this.gateway.notifyUser(withBookings.guideId, 'notification', notif);
    }

    await this.auditService.log({
      entityType: 'Assignment',
      entityId: id,
      action: 'FINALIZE',
      afterData: {
        collectedAmount,
        servicesTotal,
        netAmount,
        settlementFlow,
        finalizedByName: actor.name,
      },
      changedBy: actor.id,
    });

    return this.findOne(id);
  }

  // ─── Driver / Guide: my assignments + calendar ─────────────────────────

  /**
   * Return all non-canceled assignments where the current user is driver or guide.
   * Includes bookings, vehicle, provider, tour itinerary for the frontend role views.
   */
  async findMyAssignments(actor: AuthenticatedUser) {
    const now = new Date();
    const where: any = {
      status: { not: AssignmentStatus.CANCELED },
      OR: [{ driverId: actor.id }, { guideId: actor.id }],
    };

    const items = await this.prisma.assignment.findMany({
      where,
      include: {
        bookings: { orderBy: { paxSequence: 'asc' as const } },
        vehicle: true,
        provider: true,
        driver: { select: { id: true, name: true, email: true } },
        guide: { select: { id: true, name: true, email: true } },
        tourReport: true,
      },
      orderBy: [{ startDate: 'asc' }],
    });

    // Enrich each assignment with tour itinerary from the first booking's tour
    const enriched = await Promise.all(
      items.map(async (a) => {
        let itinerary: any[] = [];
        const firstBooking = a.bookings[0];
        if (firstBooking?.tourId) {
          const tour = await this.prisma.tour.findUnique({
            where: { id: firstBooking.tourId },
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              durationDays: true,
              departureLocation: true,
              transportation: true,
              itineraries: {
                orderBy: [{ dayNumber: 'asc' as const }, { orderIndex: 'asc' as const }],
              },
            },
          });
          if (tour) itinerary = tour.itineraries;
        }
        return this.decorateBoardCard({ ...a, itinerary });
      }),
    );

    return enriched;
  }

  /**
   * Calendar view: return a flat list of { date, tourName, assignmentId, status }
   * for the given month so the frontend can render a simple month grid.
   */
  async findMyCalendar(actor: AuthenticatedUser, year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const items = await this.prisma.assignment.findMany({
      where: {
        status: { not: AssignmentStatus.CANCELED },
        OR: [{ driverId: actor.id }, { guideId: actor.id }],
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: {
        vehicle: { select: { plateNumber: true } },
        driver: { select: { id: true, name: true } },
        guide: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return items.map((a) => {
      const tourName =
        a.tourName ?? a.code ?? 'Tour';
      return {
        id: a.id,
        code: a.code,
        tourName,
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
        tourType: a.tourType,
        durationDays: a.durationDays,
        vehiclePlate: a.vehicle?.plateNumber ?? null,
        isDriver: a.driverId === actor.id,
        isGuide: a.guideId === actor.id,
      };
    });
  }

  /**
   * Guide payment tracking over a date range, driven by Settlement data.
   * For each of the guide's (completed) assignments: collected − paid = net.
   *   - OFFICIAL guide  → net is the amount to return to the company.
   *   - FREELANCE guide → net is the money to collect.
   */
  async findMyPayments(actor: AuthenticatedUser, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate
      ? new Date(endDate + 'T23:59:59.999')
      : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

    const profile = await this.prisma.guideProfile.findUnique({
      where: { userId: actor.id },
    });
    const guideType = profile?.type ?? GuideType.FREELANCE;

    const assignments = await this.prisma.assignment.findMany({
      where: {
        guideId: actor.id,
        status: AssignmentStatus.COMPLETED,
        endDate: { gte: start, lte: end },
      },
      include: {
        settlements: {
          include: { category: true },
        },
        vehicle: { select: { plateNumber: true } },
      },
      orderBy: { endDate: 'asc' },
    });

    const lines = assignments.map((a) => {
      const collected = a.settlements.reduce(
        (sum, s) => sum + (s.category?.flowType === FeeFlowType.COLLECT_MONEY ? s.amount : 0),
        0,
      );
      const paid = a.settlements.reduce(
        (sum, s) => sum + (s.category?.flowType === FeeFlowType.PAY_MONEY ? s.amount : 0),
        0,
      );
      const net = collected - paid;
      return {
        id: a.id,
        code: a.code,
        tourName: a.tourName,
        vehiclePlate: a.vehicle?.plateNumber ?? null,
        startDate: a.startDate,
        endDate: a.endDate,
        collected,
        paid,
        net,
        items: a.settlements.map((s) => ({
          id: s.id,
          category: s.category?.name ?? s.customCategoryName ?? 'Other',
          flowType: s.category?.flowType ?? FeeFlowType.COLLECT_MONEY,
          amount: s.amount,
          note: s.note,
        })),
      };
    });

    const totalCollected = lines.reduce((s, l) => s + l.collected, 0);
    const totalPaid = lines.reduce((s, l) => s + l.paid, 0);
    const totalNet = totalCollected - totalPaid;

    return {
      guideType,
      startDate: start,
      endDate: end,
      summary: {
        tours: lines.length,
        totalCollected,
        totalPaid,
        totalNet,
      },
      lines,
    };
  }

  /**
   * Settlement summary for a date range: aggregate the net settlement of every
   * finalized tour (TourReport.finalizedAt inside [from, to]).
   * Optionally filter to one guide or one driver.
   *  - COLLECT_MONEY → guide returns money to the company (company receives).
   *  - PAY_MONEY     → company returns money to the guide.
   * A per-assignment breakdown is returned in `lines` with the places visited
   * (tour itinerary locations gathered from the bookings' tours).
   */
  async settlementSummary(
    from: string,
    to: string,
    guideId?: string,
    driverId?: string,
  ) {
    const gte = new Date(from);
    const lte = new Date(to);
    if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime()) || gte > lte) {
      throw new BadRequestException('Invalid settlement date range');
    }

    const where: any = {
      tourReport: { is: { finalizedAt: { gte, lte } } },
    };
    if (guideId) where.guideId = guideId;
    if (driverId) where.driverId = driverId;

    const assignments = await this.prisma.assignment.findMany({
      where,
      include: {
        vehicle: { select: { plateNumber: true } },
        driver: { select: { id: true, name: true, email: true } },
        guide: { select: { id: true, name: true, email: true } },
        tourReport: true,
        bookings: {
          select: {
            tourName: true,
            tour: {
              select: {
                name: true,
                itineraries: {
                  orderBy: [{ dayNumber: 'asc' }, { orderIndex: 'asc' }],
                  select: { dayNumber: true, title: true, location: true },
                },
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const toNumber = (v: unknown) => Number(v ?? 0);
    const netOf = (a: (typeof assignments)[number]) =>
      toNumber(a.tourReport?.netAmount);

    const collect = assignments.filter(
      (a) => a.tourReport?.settlementFlow === FeeFlowType.COLLECT_MONEY,
    );
    const pay = assignments.filter(
      (a) => a.tourReport?.settlementFlow === FeeFlowType.PAY_MONEY,
    );

    const lines = assignments.map((a) => {
      const places: string[] = [];
      const seen = new Set<string>();
      for (const b of a.bookings) {
        for (const it of b.tour?.itineraries ?? []) {
          const label =
            it.location && it.location !== '' ? it.location : it.title;
          if (label && !seen.has(`${label}#${it.dayNumber}`)) {
            seen.add(`${label}#${it.dayNumber}`);
            places.push(it.dayNumber > 1 ? `Day ${it.dayNumber}: ${label}` : label);
          }
        }
      }
      return {
        id: a.id,
        code: a.code ?? '—',
        tourName:
          a.tourName ??
          a.bookings.find((b) => b.tourName)?.tourName ??
          (a.bookings.find((b) => b.tour)?.tour?.name ?? null),
        vehiclePlate: a.vehicle?.plateNumber ?? null,
        guide: a.guide?.name ?? null,
        driver: a.driver?.name ?? null,
        startDate: a.startDate,
        endDate: a.endDate,
        collectedAmount: toNumber(a.tourReport?.collectedAmount),
        servicesTotal: toNumber(a.tourReport?.servicesTotal),
        netAmount: netOf(a),
        settlementFlow: a.tourReport?.settlementFlow ?? null,
        places,
      };
    });

    return {
      from,
      to,
      guideId,
      driverId,
      guideName: guideId
        ? (assignments.map((a) => a.guide?.name).find(Boolean) ?? null)
        : null,
      driverName: driverId
        ? (assignments.map((a) => a.driver?.name).find(Boolean) ?? null)
        : null,
      summary: {
        // HDV nộp lại tiền cho công ty.
        guideReturnsToCompany: {
          count: collect.length,
          total: collect.reduce((sum, a) => sum + netOf(a), 0),
        },
        // Công ty hoàn trả tiền cho HDV.
        companyReturnsToGuide: {
          count: pay.length,
          total: pay.reduce((sum, a) => sum + netOf(a), 0),
        },
      },
      lines,
    };
  }

  async findMyFleet(actor: AuthenticatedUser, startDate?: string, endDate?: string) {
    if (!actor.providerId) {
      return { providerId: null, items: [] };
    }
    const where: any = {
      providerId: actor.providerId,
      status: { not: AssignmentStatus.CANCELED },
    };
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { lte: new Date(endDate + 'T23:59:59.999') };

    const items = await this.prisma.assignment.findMany({
      where,
      include: {
        vehicle: { select: { id: true, plateNumber: true, capacity: true, brand: true } },
        driver: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true } },
        tourReport: { select: { id: true, status: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      providerId: actor.providerId,
      items: items.map((a) => ({
        id: a.id,
        code: a.code,
        tourName: a.tourName,
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
        totalPax: a.totalPax,
        tourType: a.tourType,
        vehicle: a.vehicle,
        driver: a.driver,
        tourReport: a.tourReport,
      })),
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.booking.updateMany({
      where: { assignmentId: id },
      data: { assignmentId: null, paxSequence: 0, status: BookingStatus.PENDING },
    });
    await this.prisma.assignment.delete({ where: { id } });
    await this.auditService.log({ entityType: 'Assignment', entityId: id, action: 'DELETE' });
    return { message: 'Assignment deleted' };
  }
}
