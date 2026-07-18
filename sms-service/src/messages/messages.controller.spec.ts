import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message, MessageStatus } from './entities/message.entity';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: { create: jest.Mock; findAll: jest.Mock; findOne: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), remove: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [{ provide: MessagesService, useValue: service }],
    }).compile();

    controller = module.get(MessagesController);
  });

  it('returns the captured message with a generated id', async () => {
    const entity: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    service.create.mockResolvedValue(entity);

    const result = await controller.create({
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 845231',
    });

    expect(service.create).toHaveBeenCalledWith({
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 845231',
    });
    expect(result).toEqual({
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 845231',
      status: 'captured',
      created_at: '2026-07-19T00:00:00.000Z',
    });
  });

  it('lists messages newest-first inside a { messages, total, limit, offset } envelope', async () => {
    const newer: Message = {
      id: 'sms_newer',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'newer',
      status: MessageStatus.CAPTURED,
      createdAt: new Date('2026-07-19T01:00:00.000Z'),
    };
    service.findAll.mockResolvedValue([[newer], 1]);

    const result = await controller.findAll({ limit: 20, offset: 0 });

    expect(service.findAll).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(result).toEqual({
      messages: [
        {
          id: 'sms_newer',
          to: '+8801700000000',
          from: 'SMSPit',
          message: 'newer',
          status: 'captured',
          created_at: '2026-07-19T01:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('returns an empty list when there are no messages', async () => {
    service.findAll.mockResolvedValue([[], 0]);

    const result = await controller.findAll({ limit: 20, offset: 0 });

    expect(result).toEqual({ messages: [], total: 0, limit: 20, offset: 0 });
  });

  it('returns a single message by id', async () => {
    const entity: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    service.findOne.mockResolvedValue(entity);

    const result = await controller.findOne('sms_abc123');

    expect(service.findOne).toHaveBeenCalledWith('sms_abc123');
    expect(result.id).toBe('sms_abc123');
  });

  it('propagates NotFoundException from the service for an unknown id', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('Message sms_missing not found'));

    await expect(controller.findOne('sms_missing')).rejects.toThrow(NotFoundException);
  });

  it('returns deleted_count from the service', async () => {
    service.remove.mockResolvedValue(3);

    const result = await controller.remove({ ids: ['sms_1', 'sms_2', 'sms_3'] });

    expect(service.remove).toHaveBeenCalledWith({ ids: ['sms_1', 'sms_2', 'sms_3'] });
    expect(result).toEqual({ deleted_count: 3 });
  });
});
