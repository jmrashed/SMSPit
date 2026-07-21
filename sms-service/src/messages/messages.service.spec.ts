import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
import { MessagesService } from './messages.service';
import { Message, MessageStatus } from './entities/message.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AiClient } from '../ai/ai-client';
import { QueuePublisher } from '../queue/queue-publisher';
import { MetricsService } from '../metrics/metrics.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
  };
  let realtimeGateway: { broadcastMessageCreated: jest.Mock };
  let aiClient: { detectOtp: jest.Mock; classify: jest.Mock; detectSpam: jest.Mock };
  let queuePublisher: { publishMessageCaptured: jest.Mock };
  let metrics: { messagesCapturedTotal: { inc: jest.Mock }; otpDetectedTotal: { inc: jest.Mock } };

  async function collect<T>(iterable: AsyncGenerator<T>): Promise<T[]> {
    const items: T[] = [];
    for await (const item of iterable) items.push(item);
    return items;
  }

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };
    realtimeGateway = { broadcastMessageCreated: jest.fn() };
    aiClient = {
      detectOtp: jest.fn().mockResolvedValue(null),
      classify: jest.fn().mockResolvedValue(null),
      detectSpam: jest.fn().mockResolvedValue(null),
    };
    queuePublisher = { publishMessageCaptured: jest.fn().mockResolvedValue(undefined) };
    metrics = { messagesCapturedTotal: { inc: jest.fn() }, otpDetectedTotal: { inc: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: repository },
        { provide: RealtimeGateway, useValue: realtimeGateway },
        { provide: AiClient, useValue: aiClient },
        { provide: QueuePublisher, useValue: queuePublisher },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();

    service = module.get(MessagesService);
  });

  it('persists a captured message with a generated sms_ id, scoped to the acting org', async () => {
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));

    const result = await service.create(
      {
        to: '+8801700000000',
        from: 'SMSPit',
        message: 'Your OTP is 845231',
      },
      42,
    );

    expect(result.id).toMatch(/^sms_[0-9a-f]{16}$/);
    expect(result.body).toBe('Your OTP is 845231');
    expect(result.status).toBe(MessageStatus.CAPTURED);
    expect(result.orgId).toBe(42);
    expect(repository.save).toHaveBeenCalledWith(result);
    expect(realtimeGateway.broadcastMessageCreated).toHaveBeenCalledWith(result);
    expect(queuePublisher.publishMessageCaptured).toHaveBeenCalledWith(result);
  });

  it('stores the OTP detected by ai-service on capture', async () => {
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));
    aiClient.detectOtp.mockResolvedValue('845231');

    const result = await service.create({ to: '+8801700000000', from: 'SMSPit', message: 'Your OTP is 845231' }, 42);

    expect(aiClient.detectOtp).toHaveBeenCalledWith('Your OTP is 845231');
    expect(result.otp).toBe('845231');
  });

  it('stores a null OTP when ai-service detects none (or is unreachable)', async () => {
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));
    aiClient.detectOtp.mockResolvedValue(null);

    const result = await service.create({ to: '+8801700000000', from: 'SMSPit', message: 'hi' }, 42);

    expect(result.otp).toBeNull();
  });

  it('stores the category returned by ai-service on capture', async () => {
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));
    aiClient.classify.mockResolvedValue('marketing');

    const result = await service.create({ to: '+8801700000000', from: 'SMSPit', message: '50% off sale!' }, 42);

    expect(aiClient.classify).toHaveBeenCalledWith('50% off sale!');
    expect(result.category).toBe('marketing');
  });

  it('filters by category, in addition to org scoping', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, category: 'marketing' }, 42);

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 42, category: 'marketing' } }),
    );
  });

  it('stores the spam verdict returned by ai-service on capture', async () => {
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));
    aiClient.detectSpam.mockResolvedValue(true);

    const result = await service.create({ to: '+8801700000000', from: 'SMSPit', message: 'WIN FREE CASH!!!' }, 42);

    expect(aiClient.detectSpam).toHaveBeenCalledWith('WIN FREE CASH!!!');
    expect(result.isSpam).toBe(true);
  });

  it('filters by is_spam, in addition to org scoping', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, is_spam: true }, 42);

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 42, isSpam: true } }),
    );
  });

  describe('setSpam', () => {
    it('overrides the spam verdict on the message, scoped to the acting org', async () => {
      const entity = { id: 'sms_abc123', isSpam: true } as Message;
      repository.findOneBy.mockResolvedValue(entity);
      repository.save.mockImplementation((e: Message) => Promise.resolve(e));

      const result = await service.setSpam('sms_abc123', false, 42);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'sms_abc123', orgId: 42 });
      expect(result.isSpam).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ isSpam: false }));
    });

    it('throws NotFoundException when overriding a nonexistent message', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.setSpam('sms_missing', false, 42)).rejects.toThrow(NotFoundException);
    });
  });

  it('persists a message with a null org_id when the acting key is ungrouped', async () => {
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));

    const result = await service.create({ to: '+8801700000000', from: 'SMSPit', message: 'hi' }, null);

    expect(result.orgId).toBeNull();
  });

  it('lists messages ordered by createdAt descending, scoped to the acting org', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0 }, 42);

    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: { orgId: 42 },
      order: { createdAt: 'DESC' },
      take: 20,
      skip: 0,
    });
  });

  it('scopes to a null org_id ("ungrouped") rather than matching every org', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0 }, null);

    expect(repository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: { orgId: IsNull() } }));
  });

  it('filters by to/from as an exact-match where clause, in addition to org scoping', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, to: '+8801700000000', from: 'SMSPit' }, 42);

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 42, to: '+8801700000000', from: 'SMSPit' } }),
    );
  });

  it('combines a created_after/created_before range with to/from filters', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll(
      {
        limit: 20,
        offset: 0,
        to: '+8801700000000',
        created_after: '2026-01-01T00:00:00.000Z',
        created_before: '2026-01-31T00:00:00.000Z',
      },
      42,
    );

    const call = repository.findAndCount.mock.calls[0][0];
    expect(call.where.to).toBe('+8801700000000');
    expect(call.where.createdAt).toBeDefined();
  });

  it('applies an open-ended created_after filter alone', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, created_after: '2026-01-01T00:00:00.000Z' }, 42);

    const call = repository.findAndCount.mock.calls[0][0];
    expect(call.where.createdAt).toBeDefined();
  });

  it('applies an open-ended created_before filter alone', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, created_before: '2026-01-31T00:00:00.000Z' }, 42);

    const call = repository.findAndCount.mock.calls[0][0];
    expect(call.where.createdAt).toBeDefined();
  });

  it('returns a message by id, scoped to the acting org', async () => {
    const entity = { id: 'sms_abc123' } as Message;
    repository.findOneBy.mockResolvedValue(entity);

    const result = await service.findOne('sms_abc123', 42);

    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'sms_abc123', orgId: 42 });
    expect(result).toBe(entity);
  });

  it('throws NotFoundException when the message does not exist', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('sms_missing', 42)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the message belongs to a different org', async () => {
    // The repository mock enforces the where clause itself in real
    // Postgres; here we simulate "not found for this org" by returning
    // null, which is what findOneBy({ id, orgId }) would do when the
    // row exists but under a different orgId.
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('sms_other_org', 999)).rejects.toThrow(NotFoundException);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'sms_other_org', orgId: 999 });
  });

  it('replays a message as a new entry linked to the original via replayedFrom, keeping the same org', async () => {
    const original: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      otp: '845231',
      category: null,
      isSpam: null,
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      orgId: 42,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    repository.findOneBy.mockResolvedValue(original);
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));

    const result = await service.replay('sms_abc123', 42);

    expect(result.id).toMatch(/^sms_[0-9a-f]{16}$/);
    expect(result.id).not.toBe(original.id);
    expect(result.to).toBe(original.to);
    expect(result.from).toBe(original.from);
    expect(result.body).toBe(original.body);
    expect(result.status).toBe(MessageStatus.CAPTURED);
    expect(result.replayedFrom).toBe('sms_abc123');
    expect(result.orgId).toBe(42);
    expect(repository.save).toHaveBeenCalledWith(result);
    expect(realtimeGateway.broadcastMessageCreated).toHaveBeenCalledWith(result);
  });

  it('reuses the original message\'s detected OTP on replay instead of calling ai-service again', async () => {
    const original: Message = {
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
    repository.findOneBy.mockResolvedValue(original);
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));

    const result = await service.replay('sms_abc123', 42);

    expect(result.otp).toBe('845231');
    expect(result.category).toBe('otp');
    expect(aiClient.detectOtp).not.toHaveBeenCalled();
    expect(aiClient.classify).not.toHaveBeenCalled();
    expect(queuePublisher.publishMessageCaptured).toHaveBeenCalledWith(result);
  });

  it('throws NotFoundException when replaying a nonexistent message', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.replay('sms_missing', 42)).rejects.toThrow(NotFoundException);
    expect(realtimeGateway.broadcastMessageCreated).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when replaying a message from a different org', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.replay('sms_other_org', 999)).rejects.toThrow(NotFoundException);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'sms_other_org', orgId: 999 });
  });

  it('deletes messages by id, scoped to the acting org, without requiring confirmation', async () => {
    repository.delete.mockResolvedValue({ affected: 2, raw: [] });

    const deletedCount = await service.remove({ ids: ['sms_1', 'sms_2'] }, 42);

    expect(repository.delete).toHaveBeenCalledWith({ id: In(['sms_1', 'sms_2']), orgId: 42 });
    expect(deletedCount).toBe(2);
  });

  it('rejects deleting all messages without confirm: true', async () => {
    await expect(service.remove({}, 42)).rejects.toThrow(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deletes only the acting org\'s messages when confirm is true and ids is omitted', async () => {
    repository.delete.mockResolvedValue({ affected: 5, raw: [] });

    const deletedCount = await service.remove({ confirm: true }, 42);

    expect(repository.delete).toHaveBeenCalledWith({ orgId: 42 });
    expect(deletedCount).toBe(5);
  });

  describe('streamExportBatches', () => {
    it('yields a single batch scoped to the acting org when under the batch size', async () => {
      const messages = [{ id: 'sms_1' }, { id: 'sms_2' }] as Message[];
      repository.find.mockResolvedValueOnce(messages);

      const batches = await collect(service.streamExportBatches({ format: 'json' }, 42));

      expect(batches).toEqual([messages]);
      expect(repository.find).toHaveBeenCalledTimes(1);
      expect(repository.find).toHaveBeenCalledWith({
        where: { orgId: 42 },
        order: { createdAt: 'ASC', id: 'ASC' },
        take: 500,
        skip: 0,
      });
    });

    it('pages through multiple full batches before stopping on a short final batch', async () => {
      const fullBatch = Array.from({ length: 500 }, (_, i) => ({ id: `sms_${i}` }) as Message);
      const lastBatch = [{ id: 'sms_last' }] as Message[];
      repository.find.mockResolvedValueOnce(fullBatch).mockResolvedValueOnce(lastBatch);

      const batches = await collect(service.streamExportBatches({ format: 'csv' }, 42));

      expect(batches).toEqual([fullBatch, lastBatch]);
      expect(repository.find).toHaveBeenCalledTimes(2);
      expect(repository.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ skip: 500 }));
    });

    it('yields nothing when there are no matching messages', async () => {
      repository.find.mockResolvedValueOnce([]);

      const batches = await collect(service.streamExportBatches({ format: 'json' }, 42));

      expect(batches).toEqual([]);
    });

    it('applies the same to/from/created_at filters as findAll', async () => {
      repository.find.mockResolvedValueOnce([]);

      await collect(
        service.streamExportBatches(
          { format: 'json', to: '+8801700000000', created_after: '2026-01-01T00:00:00.000Z' },
          42,
        ),
      );

      const call = repository.find.mock.calls[0][0];
      expect(call.where.to).toBe('+8801700000000');
      expect(call.where.createdAt).toBeDefined();
    });
  });
});
