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

  it('computes the 21:00 HCM cutoff on the day before departure', () => {
    const service = serviceWith({});
    expect(
      service.cutoffFor('2026-11-23T00:00:00.000Z').toISOString(),
    ).toBe('2026-11-22T14:00:00.000Z');
  });

  it('opens the dispatch window at 12:00 and closes it at 21:00 HCM', () => {
    const service = serviceWith({});
    const departure = '2026-11-23T00:00:00.000Z';

    jest.setSystemTime(new Date('2026-11-22T04:59:00.000Z'));
    expect(service.dispatchWindow(departure).open).toBe(false);

    jest.setSystemTime(new Date('2026-11-22T05:00:00.000Z'));
    expect(service.dispatchWindow(departure).open).toBe(true);

    jest.setSystemTime(new Date('2026-11-22T14:00:00.000Z'));
    expect(service.dispatchWindow(departure).open).toBe(true);

    jest.setSystemTime(new Date('2026-11-22T14:01:00.000Z'));
    expect(service.dispatchWindow(departure).open).toBe(false);
  });

  it('uses the stored dispatch opening time', async () => {
    const service = serviceWith({
      dispatchOpenTime: '10:00',
      autoDispatchCron: '0 21 * * *',
    });
    const departure = '2026-11-23T00:00:00.000Z';

    jest.setSystemTime(new Date('2026-11-22T02:59:00.000Z'));
    expect((await service.getSealInfo(departure)).windowOpen).toBe(false);

    jest.setSystemTime(new Date('2026-11-22T03:00:00.000Z'));
    const info = await service.getSealInfo(departure);
    expect(info.openTime).toBe('10:00');
    expect(info.windowOpen).toBe(true);
  });

  it('rejects an opening time at or after the cutoff', () => {
    const service = serviceWith({});
    expect(service.windowOrderIsValid('12:00', '21:00')).toBe(true);
    expect(service.windowOrderIsValid('21:00', '21:00')).toBe(false);
    expect(service.windowOrderIsValid('22:00', '21:00')).toBe(false);
  });

  it('seals the date at the cutoff in both Manual and Auto mode', async () => {
    const departure = '2026-11-23T00:00:00.000Z';
    const auto = serviceWith({
      assignMode: AssignmentOrigin.AUTO_ASSIGN,
      autoDispatchEnabled: 'true',
      autoDispatchCron: '0 21 * * *',
    });
    const manual = serviceWith({
      assignMode: AssignmentOrigin.MANUAL,
      autoDispatchEnabled: 'false',
      autoDispatchCron: '0 21 * * *',
    });

    jest.setSystemTime(new Date('2026-11-22T13:59:00.000Z'));
    expect((await auto.getSealInfo(departure)).sealed).toBe(false);
    expect((await manual.getSealInfo(departure)).sealed).toBe(false);

    jest.setSystemTime(new Date('2026-11-22T14:01:00.000Z'));
    expect((await auto.getSealInfo(departure)).sealed).toBe(true);
    expect((await manual.getSealInfo(departure)).sealed).toBe(true);
  });
});
