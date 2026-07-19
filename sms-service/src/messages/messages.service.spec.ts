import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { MessagesService } from './messages.service';
import { Message, MessageStatus } from './entities/message.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('MessagesService', () => {
  let service: MessagesService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    findOneBy: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilderDelete: jest.Mock;
  let realtimeGateway: { broadcastMessageCreated: jest.Mock };

  beforeEach(async () => {
    queryBuilderDelete = jest.fn();
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnValue({ execute: queryBuilderDelete }),
      })),
    };
    realtimeGateway = { broadcastMessageCreated: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: repository },
        { provide: RealtimeGateway, useValue: realtimeGateway },
      ],
    }).compile();

    service = module.get(MessagesService);
  });

  it('persists a captured message with a generated sms_ id', async () => {
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));

    const result = await service.create({
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 845231',
    });

    expect(result.id).toMatch(/^sms_[0-9a-f]{16}$/);
    expect(result.body).toBe('Your OTP is 845231');
    expect(result.status).toBe(MessageStatus.CAPTURED);
    expect(repository.save).toHaveBeenCalledWith(result);
    expect(realtimeGateway.broadcastMessageCreated).toHaveBeenCalledWith(result);
  });

  it('lists messages ordered by createdAt descending with limit/offset applied', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0 });

    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: {},
      order: { createdAt: 'DESC' },
      take: 20,
      skip: 0,
    });
  });

  it('filters by to/from as an exact-match where clause', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, to: '+8801700000000', from: 'SMSPit' });

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { to: '+8801700000000', from: 'SMSPit' } }),
    );
  });

  it('combines a created_after/created_before range with to/from filters', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({
      limit: 20,
      offset: 0,
      to: '+8801700000000',
      created_after: '2026-01-01T00:00:00.000Z',
      created_before: '2026-01-31T00:00:00.000Z',
    });

    const call = repository.findAndCount.mock.calls[0][0];
    expect(call.where.to).toBe('+8801700000000');
    expect(call.where.createdAt).toBeDefined();
  });

  it('applies an open-ended created_after filter alone', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, created_after: '2026-01-01T00:00:00.000Z' });

    const call = repository.findAndCount.mock.calls[0][0];
    expect(call.where.createdAt).toBeDefined();
  });

  it('applies an open-ended created_before filter alone', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ limit: 20, offset: 0, created_before: '2026-01-31T00:00:00.000Z' });

    const call = repository.findAndCount.mock.calls[0][0];
    expect(call.where.createdAt).toBeDefined();
  });

  it('returns a message by id', async () => {
    const entity = { id: 'sms_abc123' } as Message;
    repository.findOneBy.mockResolvedValue(entity);

    const result = await service.findOne('sms_abc123');

    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'sms_abc123' });
    expect(result).toBe(entity);
  });

  it('throws NotFoundException when the message does not exist', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('sms_missing')).rejects.toThrow(NotFoundException);
  });

  it('replays a message as a new entry linked to the original via replayedFrom', async () => {
    const original: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    repository.findOneBy.mockResolvedValue(original);
    repository.create.mockImplementation((entity: Partial<Message>) => entity as Message);
    repository.save.mockImplementation((entity: Message) => Promise.resolve(entity));

    const result = await service.replay('sms_abc123');

    expect(result.id).toMatch(/^sms_[0-9a-f]{16}$/);
    expect(result.id).not.toBe(original.id);
    expect(result.to).toBe(original.to);
    expect(result.from).toBe(original.from);
    expect(result.body).toBe(original.body);
    expect(result.status).toBe(MessageStatus.CAPTURED);
    expect(result.replayedFrom).toBe('sms_abc123');
    expect(repository.save).toHaveBeenCalledWith(result);
    expect(realtimeGateway.broadcastMessageCreated).toHaveBeenCalledWith(result);
  });

  it('throws NotFoundException when replaying a nonexistent message', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.replay('sms_missing')).rejects.toThrow(NotFoundException);
    expect(realtimeGateway.broadcastMessageCreated).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('deletes messages by id without requiring confirmation', async () => {
    repository.delete.mockResolvedValue({ affected: 2, raw: [] });

    const deletedCount = await service.remove({ ids: ['sms_1', 'sms_2'] });

    expect(repository.delete).toHaveBeenCalledWith({ id: In(['sms_1', 'sms_2']) });
    expect(deletedCount).toBe(2);
  });

  it('rejects deleting all messages without confirm: true', async () => {
    await expect(service.remove({})).rejects.toThrow(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();
    expect(queryBuilderDelete).not.toHaveBeenCalled();
  });

  it('deletes all messages when confirm is true and ids is omitted', async () => {
    queryBuilderDelete.mockResolvedValue({ affected: 5, raw: [] });

    const deletedCount = await service.remove({ confirm: true });

    expect(queryBuilderDelete).toHaveBeenCalled();
    expect(deletedCount).toBe(5);
  });
});
