"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crewRole = void 0;
exports.hcmStartOfDay = hcmStartOfDay;
exports.hcmEndOfDay = hcmEndOfDay;
exports.tripDayRange = tripDayRange;
exports.findCrewConflict = findCrewConflict;
exports.assertCrewAvailableForDates = assertCrewAvailableForDates;
exports.busyCrewIds = busyCrewIds;
exports.leaveConflictIds = leaveConflictIds;
exports.activeHoldIds = activeHoldIds;
exports.unavailableCrewIds = unavailableCrewIds;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const HCM_OFFSET_MINUTES = 7 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;
function hcmStartOfDay(value) {
    const shifted = new Date(new Date(value).getTime() + HCM_OFFSET_MINUTES * 60 * 1000);
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - HCM_OFFSET_MINUTES * 60 * 1000);
}
function hcmEndOfDay(value) {
    return new Date(hcmStartOfDay(value).getTime() + DAY_MS - 1);
}
function tripDayRange(startDate, endDate) {
    return {
        start: hcmStartOfDay(startDate),
        end: hcmEndOfDay(endDate),
    };
}
function formatDay(value) {
    return new Date(value).toLocaleDateString('en-GB');
}
async function displayName(prisma, userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
    });
    return user?.name ?? user?.email ?? userId;
}
async function findCrewConflict(prisma, kind, userId, startDate, endDate, excludeAssignmentId) {
    const { start, end } = tripDayRange(startDate, endDate);
    const name = await displayName(prisma, userId);
    const onLeave = await prisma.userLeave.count({
        where: {
            userId,
            status: { in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.APPROVED] },
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
                status: client_1.GuideHoldStatus.ACTIVE,
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
    const crewFilter = kind === 'guide' ? { guideId: userId } : { driverId: userId };
    const clash = await prisma.assignment.findFirst({
        where: {
            status: { not: client_1.AssignmentStatus.CANCELED },
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
function conflictMessage(conflict) {
    const who = conflict.name;
    if (conflict.type === 'LEAVE') {
        return `${who} is on leave during this date range and cannot be assigned as ${conflict.label}.`;
    }
    if (conflict.type === 'HOLD') {
        return `${who} is on hold from ${formatDay(conflict.startDate)} to ${formatDay(conflict.endDate)}${conflict.note ? ` (${conflict.note})` : ''} and cannot be assigned as ${conflict.label}. Release the hold first.`;
    }
    const assignment = conflict.assignment;
    return `${who} is already on ${assignment.code ?? 'another tour'} (${formatDay(assignment.startDate)} → ${formatDay(assignment.endDate)}) and cannot be assigned as ${conflict.label} for overlapping dates.`;
}
async function assertCrewAvailableForDates(prisma, guideId, driverId, startDate, endDate, excludeAssignmentId) {
    for (const [label, userId] of [
        ['guide', guideId],
        ['driver', driverId],
    ]) {
        if (!userId)
            continue;
        const conflict = await findCrewConflict(prisma, label, userId, startDate, endDate, excludeAssignmentId);
        if (conflict)
            throw new common_1.BadRequestException(conflictMessage(conflict));
    }
}
async function busyCrewIds(prisma, kind, userIds, startDate, endDate, excludeAssignmentId) {
    if (!userIds.length)
        return new Set();
    const { start, end } = tripDayRange(startDate, endDate);
    const crewFilter = kind === 'guide'
        ? { guideId: { in: userIds } }
        : { driverId: { in: userIds } };
    const rows = await prisma.assignment.findMany({
        where: {
            status: { not: client_1.AssignmentStatus.CANCELED },
            ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
            startDate: { lte: end },
            endDate: { gte: start },
            ...crewFilter,
        },
        select: { guideId: true, driverId: true },
    });
    const field = kind === 'guide' ? 'guideId' : 'driverId';
    return new Set(rows
        .map((row) => row[field])
        .filter((id) => Boolean(id)));
}
async function leaveConflictIds(prisma, userIds, startDate, endDate) {
    if (!userIds.length)
        return new Set();
    const { start, end } = tripDayRange(startDate, endDate);
    const rows = await prisma.userLeave.findMany({
        where: {
            userId: { in: userIds },
            status: { in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.APPROVED] },
            startDate: { lte: end },
            endDate: { gte: start },
        },
        select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
}
async function activeHoldIds(prisma, guideIds, startDate, endDate) {
    if (!guideIds.length)
        return new Set();
    const { start, end } = tripDayRange(startDate, endDate);
    const rows = await prisma.guideHold.findMany({
        where: {
            guideId: { in: guideIds },
            status: client_1.GuideHoldStatus.ACTIVE,
            startDate: { lte: end },
            endDate: { gte: start },
        },
        select: { guideId: true },
    });
    return new Set(rows.map((row) => row.guideId));
}
async function unavailableCrewIds(prisma, kind, userIds, startDate, endDate, excludeAssignmentId) {
    if (!userIds.length)
        return new Set();
    const [unavailable, onLeave, onHold] = await Promise.all([
        busyCrewIds(prisma, kind, userIds, startDate, endDate, excludeAssignmentId),
        leaveConflictIds(prisma, userIds, startDate, endDate),
        kind === 'guide'
            ? activeHoldIds(prisma, userIds, startDate, endDate)
            : Promise.resolve(new Set()),
    ]);
    for (const id of onLeave)
        unavailable.add(id);
    for (const id of onHold)
        unavailable.add(id);
    return unavailable;
}
const crewRole = (kind) => kind === 'guide' ? client_1.RoleType.TOUR_GUIDE : client_1.RoleType.DRIVER;
exports.crewRole = crewRole;
//# sourceMappingURL=crew-availability.util.js.map