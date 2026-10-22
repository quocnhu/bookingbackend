jest.mock('./gmail-pubsub.service', () => ({
  GmailPubSubService: class GmailPubSubService {},
}));

import { ConfigService } from '@nestjs/config';
import { GmailSubscriberService } from './gmail-subscriber.service';
import type { GmailPubSubService } from './gmail-pubsub.service';

type MessageHandler = (message: {
  data: Buffer;
  ack: jest.Mock;
  nack: jest.Mock;
}) => void;

type ErrorHandler = (err: Error) => void;

type FakeSubscription = {
  exists: jest.Mock;
  on: jest.Mock;
  close: jest.Mock;
};

function handlerOf(
  subscription: FakeSubscription,
  event: 'message',
): MessageHandler;
function handlerOf(
  subscription: FakeSubscription,
  event: 'error',
): ErrorHandler;
function handlerOf(subscription: FakeSubscription, event: string) {
  const calls = subscription.on.mock.calls as [string, unknown][];
  const call = calls.find(([name]) => name === event);
  return call?.[1] as MessageHandler | ErrorHandler | undefined;
}

function makeService(env: Record<string, string | undefined>) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  const gmailPubSub = {
    handlePush: jest.fn().mockResolvedValue({ inserted: 1 }),
  };

  const service = new GmailSubscriberService(
    config,
    gmailPubSub as unknown as GmailPubSubService,
  );
  return { service, gmailPubSub };
}

function makePubSub(options: {
  exists: jest.Mock;
  createSubscription?: jest.Mock;
}) {
  const subscription: FakeSubscription = {
    exists: options.exists,
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const topic = {
    createSubscription:
      options.createSubscription ?? jest.fn().mockResolvedValue([{}]),
  };
  const pubsub = {
    subscription: jest.fn(() => subscription),
    topic: jest.fn(() => topic),
  };
  return { pubsub, subscription, topic };
}

const SUB =
  'projects/melodic-keyword-495418-g2/subscriptions/gmail-notifications-sub';

describe('GmailSubscriberService (streaming pull)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing when streaming pull is disabled', () => {
    const { service } = makeService({
      GOOGLE_PUBSUB_PULL_ENABLED: 'false',
      GOOGLE_PUBSUB_SUBSCRIPTION: SUB,
    });

    service.onModuleInit();

    expect((service as unknown as { pubsub?: unknown }).pubsub).toBeUndefined();
  });

  it('opens the streaming pull once the subscription exists', async () => {
    const exists = jest.fn().mockResolvedValue([true]);
    const { pubsub, subscription } = makePubSub({ exists });
    const { service } = makeService({
      GOOGLE_PUBSUB_PULL_ENABLED: 'true',
      GOOGLE_PUBSUB_SUBSCRIPTION: SUB,
    });
    (service as unknown as { pubsub: unknown }).pubsub = pubsub;

    await (service as unknown as { connect(): Promise<void> }).connect();

    expect(exists).toHaveBeenCalled();
    expect(pubsub.subscription).toHaveBeenCalledWith(
      SUB,
      expect.objectContaining({ flowControl: { maxMessages: 10 } }),
    );
    expect(subscription.on).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
    expect(subscription.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('runs the shared ingestion pipeline for each pulled message', async () => {
    const exists = jest.fn().mockResolvedValue([true]);
    const { pubsub, subscription } = makePubSub({ exists });
    const { service, gmailPubSub } = makeService({
      GOOGLE_PUBSUB_PULL_ENABLED: 'true',
      GOOGLE_PUBSUB_SUBSCRIPTION: SUB,
    });
    (service as unknown as { pubsub: unknown }).pubsub = pubsub;

    await (service as unknown as { connect(): Promise<void> }).connect();

    const handler = handlerOf(subscription, 'message');

    const ack = jest.fn();
    const nack = jest.fn();
    handler({
      data: Buffer.from(
        JSON.stringify({
          emailAddress: 'owner@example.com',
          historyId: '1139765',
        }),
      ),
      ack,
      nack,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(gmailPubSub.handlePush).toHaveBeenCalledWith({
      emailAddress: 'owner@example.com',
      historyId: 1139765,
    });
    expect(ack).toHaveBeenCalled();
    expect(nack).not.toHaveBeenCalled();
  });

  it('nacks when the pipeline throws so Pub/Sub redelivers', async () => {
    const exists = jest.fn().mockResolvedValue([true]);
    const { pubsub, subscription } = makePubSub({ exists });
    const { service, gmailPubSub } = makeService({
      GOOGLE_PUBSUB_PULL_ENABLED: 'true',
      GOOGLE_PUBSUB_SUBSCRIPTION: SUB,
    });
    (service as unknown as { pubsub: unknown }).pubsub = pubsub;
    gmailPubSub.handlePush.mockRejectedValueOnce(new Error('db down'));

    await (service as unknown as { connect(): Promise<void> }).connect();

    const handler = handlerOf(subscription, 'message');

    const ack = jest.fn();
    const nack = jest.fn();
    handler({
      data: Buffer.from(
        JSON.stringify({ emailAddress: 'owner@example.com', historyId: 1 }),
      ),
      ack,
      nack,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(ack).not.toHaveBeenCalled();
    expect(nack).toHaveBeenCalled();
  });

  it('auto-creates a missing subscription before opening the stream', async () => {
    const exists = jest.fn().mockResolvedValue([false]);
    const createSubscription = jest.fn().mockResolvedValue([{}]);
    const { pubsub } = makePubSub({ exists, createSubscription });
    const { service } = makeService({
      GOOGLE_PUBSUB_PULL_ENABLED: 'true',
      GOOGLE_PUBSUB_AUTO_CREATE_SUBSCRIPTION: 'true',
      GOOGLE_PUBSUB_SUBSCRIPTION: SUB,
      GOOGLE_PUBSUB_TOPIC:
        'projects/melodic-keyword-495418-g2/topics/gmail-notifications',
    });
    (service as unknown as { pubsub: unknown }).pubsub = pubsub;

    await (service as unknown as { connect(): Promise<void> }).connect();

    expect(createSubscription).toHaveBeenCalledWith('gmail-notifications-sub', {
      ackDeadlineSeconds: 60,
    });
    expect(pubsub.subscription).toHaveBeenCalled();
  });

  it('keeps retrying when the subscription is missing and cannot be created', async () => {
    jest.useFakeTimers();
    const denied = Object.assign(new Error('denied'), { code: 7 });
    const exists = jest.fn().mockResolvedValue([false]);
    const createSubscription = jest.fn().mockRejectedValue(denied);
    const { pubsub } = makePubSub({ exists, createSubscription });
    const { service } = makeService({
      GOOGLE_PUBSUB_PULL_ENABLED: 'true',
      GOOGLE_PUBSUB_AUTO_CREATE_SUBSCRIPTION: 'true',
      GOOGLE_PUBSUB_SUBSCRIPTION: SUB,
      GOOGLE_PUBSUB_RECONNECT_MS: '30000',
    });
    (service as unknown as { pubsub: unknown }).pubsub = pubsub;
    const connect = jest.spyOn(
      service as unknown as { connect(): Promise<void> },
      'connect',
    );

    await (service as unknown as { connect(): Promise<void> }).connect();
    expect(createSubscription).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(30_000);
    expect(connect).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(30_000);
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it('reconnects after a NOT_FOUND stream error without a restart', async () => {
    jest.useFakeTimers();
    const exists = jest
      .fn()
      .mockResolvedValueOnce([true])
      .mockResolvedValue([true]);
    const { pubsub, subscription } = makePubSub({ exists });
    const { service } = makeService({
      GOOGLE_PUBSUB_PULL_ENABLED: 'true',
      GOOGLE_PUBSUB_SUBSCRIPTION: SUB,
      GOOGLE_PUBSUB_RECONNECT_MS: '30000',
    });
    (service as unknown as { pubsub: unknown }).pubsub = pubsub;

    await (service as unknown as { connect(): Promise<void> }).connect();

    const onError = handlerOf(subscription, 'error');

    onError(Object.assign(new Error('not found'), { code: 5 }));
    await jest.advanceTimersByTimeAsync(30_000);

    const openedStreams = pubsub.subscription.mock.calls.filter(
      ([, options]) => options,
    );
    expect(openedStreams).toHaveLength(2);
  });
});
