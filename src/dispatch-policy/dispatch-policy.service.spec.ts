import { AssignmentOrigin } from '@prisma/client';
import { DispatchPolicyService } from './dispatch-policy.service';

function serviceWith(settings: Record<string, string>) {
  const prisma = {
    systemSetting: {
      findMany: jest.fn().mockResolvedValue(
        Object.entries(settings).map(([key, value]) => ({ key, value })),
      ),
    },
  } as any;
  return new DispatchPolicyService(prisma);
}

describe('DispatchPolicyService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes the 23:00 HCM cutoff on the day before departure', () => {
    const service = serviceWith({});
    expect(
      service.cutoffFor('2026-11-23T00:00:00.000Z').toISOString(),
    ).toBe('2026-11-22T16:00:00.000Z');
  });

  it('seals auto-mode dates only after the cutoff', async () => {
    const service = serviceWith({
      assignMode: AssignmentOrigin.AUTO_ASSIGN,
      autoDispatchEnabled: 'true',
      autoDispatchCron: '0 23 * * *',
      autoModeActivatedAt: '2026-11-01T00:00:00.000Z',
    });

    jest.setSystemTime(new Date('2026-11-22T15:59:00.000Z'));
    expect(
      (await service.getSealInfo('2026-11-23T00:00:00.000Z')).sealed,
    ).toBe(false);

    jest.setSystemTime(new Date('2026-11-22T16:01:00.000Z'));
    expect(
      (await service.getSealInfo('2026-11-23T00:00:00.000Z')).sealed,
    ).toBe(true);
  });

  it('does not seal manual mode or auto mode enabled after the cutoff', async () => {
    jest.setSystemTime(new Date('2026-11-22T16:30:00.000Z'));

    const manual = serviceWith({
      assignMode: AssignmentOrigin.MANUAL,
      autoDispatchEnabled: 'true',
      autoDispatchCron: '0 23 * * *',
    });
    expect(
      (await manual.getSealInfo('2026-11-23T00:00:00.000Z')).sealed,
    ).toBe(false);

    const enabledLate = serviceWith({
      assignMode: AssignmentOrigin.AUTO_ASSIGN,
      autoDispatchEnabled: 'true',
      autoDispatchCron: '0 23 * * *',
      autoModeActivatedAt: '2026-11-22T16:10:00.000Z',
    });
    expect(
      (await enabledLate.getSealInfo('2026-11-23T00:00:00.000Z')).sealed,
    ).toBe(false);
  });
});
