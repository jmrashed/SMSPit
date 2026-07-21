import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import Redis from 'ioredis';
import { QueuePublisher, CAPTURED_STREAM } from './queue-publisher';
import { Message, MessageStatus } from '../messages/entities/message.entity';

jest.mock('ioredis');

describe('QueuePublisher', () => {
  const message: Message = {
    id: 'sms_abc123',
    to: '+8801700000000',
    from: 'SMSPit',
    body: 'Your OTP is 845231',
    otp: '845231',
    category: 'otp',
    isSpam: null,
    status: MessageStatus.CAPTURED,
    replayedFrom: null,
    orgId: 42,
    createdAt: new Date('2026-07-19T00:00:00.000Z'),
  };

  afterEach(() => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    jest.clearAllMocks();
  });

  it('publishes a captured message to the stream with its fields', async () => {
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = '6379';

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [QueuePublisher],
    }).compile();
    const publisher = module.get(QueuePublisher);

    const redisInstance = (Redis as unknown as jest.Mock).mock.instances[0] as { xadd: jest.Mock };
    redisInstance.xadd.mockResolvedValue('1-0');

    await publisher.publishMessageCaptured(message);

    expect(redisInstance.xadd).toHaveBeenCalledWith(
      CAPTURED_STREAM,
      '*',
      'id',
      'sms_abc123',
      'to',
      '+8801700000000',
      'from',
      'SMSPit',
      'message',
      'Your OTP is 845231',
      'org_id',
      '42',
    );
  });

  it('does not construct a Redis client when REDIS_HOST is unset', async () => {
    delete process.env.REDIS_HOST;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      providers: [QueuePublisher],
    }).compile();
    const publisher = module.get(QueuePublisher);

    await expect(publisher.publishMessageCaptured(message)).resolves.toBeUndefined();
    expect(Redis).not.toHaveBeenCalled();
  });

  it('swallows a publish failure instead of throwing (never blocks capture)', async () => {
    process.env.REDIS_HOST = '127.0.0.1';

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [QueuePublisher],
    }).compile();
    const publisher = module.get(QueuePublisher);

    const redisInstance = (Redis as unknown as jest.Mock).mock.instances[0] as { xadd: jest.Mock };
    redisInstance.xadd.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(publisher.publishMessageCaptured(message)).resolves.toBeUndefined();
  });
});
