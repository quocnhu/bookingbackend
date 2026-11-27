import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '@/prisma/prisma.service';
import {
  assertCrewAvailableForDates,
  busyCrewIds,
  findCrewConflict,
  hcmEndOfDay,
  hcmStartOfDay,
  unavailableCrewIds,
} from './crew-availability.util';

const atHcm = (day: string, hour: number) =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:00:00.000Z`);

function mockPrisma(overrides: Record<string, unknown> = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ name: 'Test Crew', email: 'crew@demo.local' }),
    },
    userLeave: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    guideHold: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    assignment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
  return prisma as unknown as PrismaService & typeof prisma;
}

describe('crew availability', () => {
  it('normalizes trip days to the HCM calendar day', () => {
    const start = hcmStartOfDay(atHcm('2026-12-01', 0));
    const end = hcmEndOfDay(atHcm('2026-12-01', 15));

    expect(start.toISOString()).toBe('2026-11-30T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T16:59:59.999Z');
  });

  it('blocks a second trip on the same HCM day even when hours do not overlap', async () => {
    const prisma = mockPrisma();
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'trip-1',
      code: 'GRP-DEMO-01',
      startDate: atHcm('2026-12-01', 1),
      endDate: atHcm('2026-12-01', 3),
    });

    const conflict = await findCrewConflict(
      prisma,
      'guide',
      'guide-1',
      atHcm('2026-12-01', 8),
      atHcm('2026-12-01', 9),
    );

    expect(conflict).toMatchObject({ type: 'ASSIGNMENT', userId: 'guide-1' });
    expect(prisma.assignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: 'CANCELED' },
          guideId: 'guide-1',
        }),
      }),
    );
  });

  it('includes COMPLETED trips but ignores CANCELED trips', async () => {
    const prisma = mockPrisma();
    prisma.assignment.findMany.mockResolvedValue([
      { guideId: 'guide-1', driverId: null },
      { guideId: null, driverId: 'driver-1' },
    ]);

    const busy = await busyCrewIds(
      prisma,
      'guide',
      ['guide-1', 'guide-2'],
      atHcm('2026-12-01', 1),
      atHcm('2026-12-01', 3),
    );

    expect(busy.has('guide-1')).toBe(true);
    expect(busy.has('guide-2')).toBe(false);
    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: 'CANCELED' } }),
      }),
    );
  });

  it('blocks overlapping multi-day ranges and allows disjoint days', async () => {
    const prisma = mockPrisma();
    prisma.assignment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'trip-2',
      code: 'TRIP-2',
      startDate: atHcm('2026-12-03', 1),
      endDate: atHcm('2026-12-04', 1),
    });

    expect(
      await findCrewConflict(
        prisma,
        'driver',
        'driver-1',
        atHcm('2026-12-01', 1),
        atHcm('2026-12-02', 1),
      ),
    ).toBeNull();
    expect(
      await findCrewConflict(
        prisma,
        'driver',
        'driver-1',
        atHcm('2026-12-02', 8),
        atHcm('2026-12-03', 9),
      ),
    ).toMatchObject({ type: 'ASSIGNMENT' });
  });

  it('reports leave and active guide holds with the same day rule', async () => {
    const prisma = mockPrisma();
    prisma.userLeave.count.mockResolvedValue(1);
    const leave = await findCrewConflict(
      prisma,
      'guide',
      'guide-1',
      atHcm('2026-12-01', 1),
      atHcm('2026-12-01', 2),
    );
    expect(leave?.type).toBe('LEAVE');

    prisma.userLeave.count.mockResolvedValue(0);
    prisma.guideHold.findFirst.mockResolvedValue({
      id: 'hold-1',
      startDate: atHcm('2026-11-30', 0),
      endDate: atHcm('2026-12-02', 0),
      note: 'Reserved',
    });
    const hold = await findCrewConflict(
      prisma,
      'guide',
      'guide-1',
      atHcm('2026-12-01', 1),
      atHcm('2026-12-01', 2),
    );
    expect(hold).toMatchObject({ type: 'HOLD', note: 'Reserved' });
  });

  it('throws a human-readable error from the canonical assert helper', async () => {
    const prisma = mockPrisma();
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'trip-1',
      code: 'TRIP-1',
      startDate: atHcm('2026-12-01', 1),
      endDate: atHcm('2026-12-01', 2),
    });

    await expect(
      assertCrewAvailableForDates(
        prisma,
        null,
        'driver-1',
        atHcm('2026-12-01', 8),
        atHcm('2026-12-01', 9),
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      assertCrewAvailableForDates(
        prisma,
        null,
        'driver-1',
        atHcm('2026-12-01', 8),
        atHcm('2026-12-01', 9),
      ),
    ).rejects.toThrow(/TRIP-1/);
  });

  it('filters auto-crew/provider candidates with the same rules', async () => {
    const prisma = mockPrisma();
    prisma.assignment.findMany.mockResolvedValue([{ guideId: 'guide-1', driverId: null }]);
    prisma.userLeave.findMany.mockResolvedValue([{ userId: 'guide-2' }]);
    prisma.guideHold.findMany.mockResolvedValue([{ guideId: 'guide-3' }]);

    const unavailable = await unavailableCrewIds(
      prisma,
      'guide',
      ['guide-1', 'guide-2', 'guide-3', 'guide-4'],
      atHcm('2026-12-01', 1),
      atHcm('2026-12-01', 2),
    );

    expect([...unavailable].sort()).toEqual(['guide-1', 'guide-2', 'guide-3']);
  });
});
