import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BookingStatus, AssignmentStatus, PaymentStatus } from '@prisma/client';

export type RangeKey = 'day' | 'week' | 'month';

interface Bucket {
  label: string;
  start: number;
  end: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private buildBuckets(range: RangeKey): Bucket[] {
    const now = new Date();
    const buckets: Bucket[] = [];
    if (range === 'day') {
      for (let h = 23; h >= 0; h--) {
        const start = new Date(now);
        start.setHours(now.getHours() - h, 0, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + 1);
        buckets.push({ label: `${start.getHours()}:00`, start: start.getTime(), end: end.getTime() });
      }
    } else {
      const days = range === 'week' ? 7 : 30;
      for (let d = days - 1; d >= 0; d--) {
        const start = new Date(now);
        start.setDate(now.getDate() - d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        const label = `${start.getDate()}/${start.getMonth() + 1}`;
        buckets.push({ label, start: start.getTime(), end: end.getTime() });
      }
    }
    return buckets;
  }

  private bucketIndex(list: Bucket[], time: number): number {
    for (let i = 0; i < list.length; i++) {
      if (time >= list[i].start && time < list[i].end) return i;
    }
    return -1;
  }

  async stats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalBookings,
      todayBookings,
      pendingBookings,
      todayDispatched,
      totalTours,
      totalUsers,
      totalRoles,
      totalPermissions,
      totalAssignments,
      todayLogins,
      lockedAccounts,
    ] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.assignment.count({
        where: { status: AssignmentStatus.DISPATCHED, startDate: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.assignment.count({ where: { status: AssignmentStatus.VERIFYING } }),
      this.prisma.tour.count(),
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.assignment.count(),
      this.prisma.userSession.count({ where: { loggedInAt: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.user.count({ where: { lockoutUntil: { gt: new Date() } } }),
    ]);

    return {
      totalBookings,
      todayBookings,
      pendingBookings,
      todayDispatched,
      totalTours,
      totalUsers,
      totalRoles,
      totalPermissions,
      totalAssignments,
      todayLogins,
      lockedAccounts,
    };
  }

  async charts(range: RangeKey) {
    const buckets = this.buildBuckets(range);
    const startTime = buckets[0].start;
    const endTime = buckets[buckets.length - 1].end;

    const [bookings, sessions, auditLogs] = await Promise.all([
      this.prisma.booking.findMany({
        where: { createdAt: { gte: new Date(startTime), lte: new Date(endTime) } },
        select: { createdAt: true, payment: true, status: true },
      }),
      this.prisma.userSession.findMany({
        where: { loggedInAt: { gte: new Date(startTime), lte: new Date(endTime) } },
        select: { loggedInAt: true },
      }),
      this.prisma.auditLog.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        select: { action: true },
      }),
    ]);

    const bookingsByBucket = buckets.map((b) => ({
      label: b.label,
      count: bookings.filter((x) => this.bucketIndex(buckets, x.createdAt.getTime()) === buckets.indexOf(b)).length,
    }));

    const loginsByBucket = buckets.map((b) => ({
      label: b.label,
      count: sessions.filter((x) => this.bucketIndex(buckets, x.loggedInAt.getTime()) === buckets.indexOf(b)).length,
    }));

    const paymentStatusDistribution = (
      [PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.REFUNDED] as PaymentStatus[]
    ).map((status) => ({
      status,
      value: bookings.filter((b) => b.payment === status).length,
    }));

    const bookingStatusDistribution = (
      [BookingStatus.PENDING, BookingStatus.ASSIGNED, BookingStatus.CANCELED] as BookingStatus[]
    ).map((status) => ({
      status,
      value: bookings.filter((b) => b.status === status).length,
    }));

    const actionCounts = new Map<string, number>();
    for (const log of auditLogs) {
      actionCounts.set(log.action, (actionCounts.get(log.action) ?? 0) + 1);
    }
    const activityByAction = [...actionCounts.entries()].map(([action, count]) => ({ action, count }));

    return {
      range,
      bookingsByBucket,
      loginsByBucket,
      paymentStatusDistribution,
      bookingStatusDistribution,
      activityByAction,
    };
  }

  async widgets() {
    const recentBookings = await this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { tour: { select: { id: true, name: true } } },
    });
    const recentRawData = await this.prisma.rawData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, sourceId: true, status: true, createdAt: true },
    });
    const assignmentsToday = await this.prisma.assignment.findMany({
      where: { status: AssignmentStatus.DISPATCHED },
      orderBy: { startDate: 'desc' },
      take: 5,
    });
    const recentAuthActivity = await this.prisma.authActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    const recentActions = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return {
      recentBookings,
      recentRawData,
      assignmentsToday,
      recentAuthActivity,
      recentActions,
    };
  }
}
