import { BadRequestException } from '@nestjs/common';
import {
  AssignmentStatus,
  GuideHoldStatus,
  LeaveStatus,
  RoleType,
} from '@prisma/client';
import type { PrismaService } from '@/prisma/prisma.service';

const HCM_OFFSET_MINUTES = 7 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CrewKind = 'guide' | 'driver';

export interface CrewConflict {
  type: 'LEAVE' | 'HOLD' | 'ASSIGNMENT';
  userId: string;
  name: string;
  label: CrewKind;
  startDate?: Date;
  endDate?: Date;
  note?: string | null;
  assignment?: {
    id: string;
    code: string | null;
    startDate: Date;
    endDate: Date;
  };
}

/** Start of the HCM calendar day containing `value`, returned as a UTC instant. */
export function hcmStartOfDay(value: Date | string) {
  const shifted = new Date(new Date(value).getTime() + HCM_OFFSET_MINUTES * 60 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - HCM_OFFSET_MINUTES * 60 * 1000,
  );
}

/** End of the HCM calendar day containing `value`, returned as a UTC instant. */
export function hcmEndOfDay(value: Date | string) {
  return new Date(hcmStartOfDay(value).getTime() + DAY_MS - 1);
}

/** Inclusive HCM day range used by every crew availability check. */
export function tripDayRange(startDate: Date, endDate: Date) {
  return {
    start: hcmStartOfDay(startDate),
    end: hcmEndOfDay(endDate),
  };
}

function formatDay(value: Date) {
  return new Date(value).toLocaleDateString('en-GB');
}

async function displayName(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return user?.name ?? user?.email ?? userId;
}

/**
 * The single source of truth for "can this person take this trip?".
 *
 * A guide/driver already assigned to ANY non-canceled assignment overlapping
 * the same HCM calendar day is unavailable, even when the hours do not overlap
 * and even when that trip is COMPLETED. PENDING/APPROVED leave and active guide
 * holds block in the same way.
 */
export async function findCrewConflict(
  prisma: PrismaService,
  kind: CrewKind,
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeAssignmentId?: string,
): Promise<CrewConflict | null> {
  const { start, end } = tripDayRange(startDate, endDate);
  const name = await displayName(prisma, userId);

  const onLeave = await prisma.userLeave.count({
    where: {
      userId,
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (onLeave > 0) {
    return { type: 'LEAVE', userId, name, label: kind, startDate: start, endDate: end };
  }

  if (kind === 'guide') {
    const hold = await prisma.guideHold.findFirst({
      where: {
        guideId: userId,
        status: GuideHoldStatus.ACTIVE,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true, startDate: true, endDate: true, note: true },
    });
    if (hold) {
      return {
        type: 'HOLD',
        userId,
        name,
        label: kind,
        startDate: hold.startDate,
        endDate: hold.endDate,
        note: hold.note,
      };
    }
  }

  const crewFilter =
    kind === 'guide' ? { guideId: userId } : { driverId: userId };
  const clash = await prisma.assignment.findFirst({
    where: {
      status: { not: AssignmentStatus.CANCELED },
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      startDate: { lte: end },
      endDate: { gte: start },
      ...crewFilter,
    },
    select: { id: true, code: true, startDate: true, endDate: true },
  });
  if (clash) {
    return {
      type: 'ASSIGNMENT',
      userId,
      name,
      label: kind,
      assignment: {
        id: clash.id,
        code: clash.code,
        startDate: clash.startDate,
        endDate: clash.endDate,
      },
    };
  }

  return null;
}

function conflictMessage(conflict: CrewConflict) {
  const who = conflict.name;
  if (conflict.type === 'LEAVE') {
    return `${who} is on leave during this date range and cannot be assigned as ${conflict.label}.`;
  }
  if (conflict.type === 'HOLD') {
    return `${who} is on hold from ${formatDay(conflict.startDate!)} to ${formatDay(conflict.endDate!)}${conflict.note ? ` (${conflict.note})` : ''} and cannot be assigned as ${conflict.label}. Release the hold first.`;
  }
  const assignment = conflict.assignment!;
  return `${who} is already on ${assignment.code ?? 'another tour'} (${formatDay(assignment.startDate)} → ${formatDay(assignment.endDate)}) and cannot be assigned as ${conflict.label} for overlapping dates.`;
}

/** Throw the canonical error for an unavailable guide/driver. */
export async function assertCrewAvailableForDates(
  prisma: PrismaService,
  guideId: string | null | undefined,
  driverId: string | null | undefined,
  startDate: Date,
  endDate: Date,
  excludeAssignmentId?: string,
) {
  for (const [label, userId] of [
    ['guide', guideId],
    ['driver', driverId],
  ] as const) {
    if (!userId) continue;
    const conflict = await findCrewConflict(
      prisma,
      label,
      userId,
      startDate,
      endDate,
      excludeAssignmentId,
    );
    if (conflict) throw new BadRequestException(conflictMessage(conflict));
  }
}

/** Bulk candidate filter using exactly the same status/date rule as assignments. */
export async function busyCrewIds(
  prisma: PrismaService,
  kind: CrewKind,
  userIds: string[],
  startDate: Date,
  endDate: Date,
  excludeAssignmentId?: string,
): Promise<Set<string>> {
  if (!userIds.length) return new Set<string>();
  const { start, end } = tripDayRange(startDate, endDate);
  const crewFilter =
    kind === 'guide'
      ? { guideId: { in: userIds } }
      : { driverId: { in: userIds } };
  const rows = await prisma.assignment.findMany({
    where: {
      status: { not: AssignmentStatus.CANCELED },
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      startDate: { lte: end },
      endDate: { gte: start },
      ...crewFilter,
    },
    select: { guideId: true, driverId: true },
  });
  const field = kind === 'guide' ? 'guideId' : 'driverId';
  return new Set(
    rows
      .map((row) => row[field])
      .filter((id): id is string => Boolean(id)),
  );
}

/** Users with PENDING/APPROVED leave overlapping the HCM trip dates. */
export async function leaveConflictIds(
  prisma: PrismaService,
  userIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<Set<string>> {
  if (!userIds.length) return new Set<string>();
  const { start, end } = tripDayRange(startDate, endDate);
  const rows = await prisma.userLeave.findMany({
    where: {
      userId: { in: userIds },
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { userId: true },
  });
  return new Set(rows.map((row) => row.userId));
}

/** Guides with an ACTIVE hold overlapping the HCM trip dates. */
export async function activeHoldIds(
  prisma: PrismaService,
  guideIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<Set<string>> {
  if (!guideIds.length) return new Set<string>();
  const { start, end } = tripDayRange(startDate, endDate);
  const rows = await prisma.guideHold.findMany({
    where: {
      guideId: { in: guideIds },
      status: GuideHoldStatus.ACTIVE,
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { guideId: true },
  });
  return new Set(rows.map((row) => row.guideId));
}

/**
 * Candidate filter for bulk selection (auto-crew and provider suggestions).
 * Uses the same leave/hold/assignment rules as `assertCrewAvailableForDates`.
 */
export async function unavailableCrewIds(
  prisma: PrismaService,
  kind: CrewKind,
  userIds: string[],
  startDate: Date,
  endDate: Date,
  excludeAssignmentId?: string,
): Promise<Set<string>> {
  if (!userIds.length) return new Set<string>();
  const [unavailable, onLeave, onHold] = await Promise.all([
    busyCrewIds(
      prisma,
      kind,
      userIds,
      startDate,
      endDate,
      excludeAssignmentId,
    ),
    leaveConflictIds(prisma, userIds, startDate, endDate),
    kind === 'guide'
      ? activeHoldIds(prisma, userIds, startDate, endDate)
      : Promise.resolve(new Set<string>()),
  ]);
  for (const id of onLeave) unavailable.add(id);
  for (const id of onHold) unavailable.add(id);
  return unavailable;
}

/** Role used by the UI/API when converting a crew kind to the Prisma enum. */
export const crewRole = (kind: CrewKind) =>
  kind === 'guide' ? RoleType.TOUR_GUIDE : RoleType.DRIVER;
