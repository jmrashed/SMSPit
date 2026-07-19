import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message, MessageStatus } from './entities/message.entity';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuthClient } from '../auth/auth-client';

function fakeRequest(orgId: number | null = 42): Request {
  return { apiKey: { id: 1, name: 'test', owner_id: 1, org_id: orgId, scopes: [] } } as unknown as Request;
}

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: { create: jest.Mock; findAll: jest.Mock; findOne: jest.Mock; replay: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), replay: jest.fn(), remove: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        { provide: MessagesService, useValue: service },
        ApiKeyGuard,
        { provide: AuthClient, useValue: { validateToken: jest.fn() } },
      ],
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
      replayedFrom: null,
      orgId: 42,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    service.create.mockResolvedValue(entity);

    const result = await controller.create(
      {
        to: '+8801700000000',
        from: 'SMSPit',
        message: 'Your OTP is 845231',
      },
      fakeRequest(),
    );

    expect(service.create).toHaveBeenCalledWith(
      {
        to: '+8801700000000',
        from: 'SMSPit',
        message: 'Your OTP is 845231',
      },
      42,
    );
    expect(result).toEqual({
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 845231',
      status: 'captured',
      replayed_from: null,
      org_id: 42,
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
      replayedFrom: null,
      orgId: 42,
      createdAt: new Date('2026-07-19T01:00:00.000Z'),
    };
    service.findAll.mockResolvedValue([[newer], 1]);

    const result = await controller.findAll({ limit: 20, offset: 0 }, fakeRequest());

    expect(service.findAll).toHaveBeenCalledWith({ limit: 20, offset: 0 }, 42);
    expect(result).toEqual({
      messages: [
        {
          id: 'sms_newer',
          to: '+8801700000000',
          from: 'SMSPit',
          message: 'newer',
          status: 'captured',
          replayed_from: null,
          org_id: 42,
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

    const result = await controller.findAll({ limit: 20, offset: 0 }, fakeRequest());

    expect(result).toEqual({ messages: [], total: 0, limit: 20, offset: 0 });
  });

  it('returns a single message by id', async () => {
    const entity: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      orgId: 42,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    service.findOne.mockResolvedValue(entity);

    const result = await controller.findOne('sms_abc123', fakeRequest());

    expect(service.findOne).toHaveBeenCalledWith('sms_abc123', 42);
    expect(result.id).toBe('sms_abc123');
  });

  it('propagates NotFoundException from the service for an unknown id', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('Message sms_missing not found'));

    await expect(controller.findOne('sms_missing', fakeRequest())).rejects.toThrow(NotFoundException);
  });

  it('returns the replay as a new message linked to the original', async () => {
    const replay: Message = {
      id: 'sms_replay123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      replayedFrom: 'sms_abc123',
      orgId: 42,
      createdAt: new Date('2026-07-19T02:00:00.000Z'),
    };
    service.replay.mockResolvedValue(replay);

    const result = await controller.replay('sms_abc123', fakeRequest());

    expect(service.replay).toHaveBeenCalledWith('sms_abc123', 42);
    expect(result).toEqual({
      id: 'sms_replay123',
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 845231',
      status: 'captured',
      replayed_from: 'sms_abc123',
      org_id: 42,
      created_at: '2026-07-19T02:00:00.000Z',
    });
  });

  it('propagates NotFoundException from the service when replaying an unknown id', async () => {
    service.replay.mockRejectedValue(new NotFoundException('Message sms_missing not found'));

    await expect(controller.replay('sms_missing', fakeRequest())).rejects.toThrow(NotFoundException);
  });

  it('returns deleted_count from the service', async () => {
    service.remove.mockResolvedValue(3);

    const result = await controller.remove({ ids: ['sms_1', 'sms_2', 'sms_3'] }, fakeRequest());

    expect(service.remove).toHaveBeenCalledWith({ ids: ['sms_1', 'sms_2', 'sms_3'] }, 42);
    expect(result).toEqual({ deleted_count: 3 });
  });
});
