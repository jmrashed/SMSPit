import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MessageBirdController } from './messagebird.controller';
import { MessagesService } from '../../messages/messages.service';
import { Message, MessageStatus } from '../../messages/entities/message.entity';

describe('MessageBirdController', () => {
  let controller: MessageBirdController;
  let messagesService: { create: jest.Mock };

  beforeEach(async () => {
    messagesService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageBirdController],
      providers: [{ provide: MessagesService, useValue: messagesService }],
    }).compile();

    controller = module.get(MessageBirdController);
  });

  const entity: Message = {
    id: 'sms_abc123',
    to: '31612345678',
    from: 'SMSPit',
    body: 'Hello World',
    status: MessageStatus.CAPTURED,
    replayedFrom: null,
    createdAt: new Date('2026-07-19T00:00:00.000Z'),
  };

  it('translates a MessageBird single-recipient payload to a capture call', async () => {
    messagesService.create.mockResolvedValue(entity);

    const result = await controller.send({
      originator: 'SMSPit',
      recipients: '31612345678',
      body: 'Hello World',
    });

    expect(messagesService.create).toHaveBeenCalledWith({
      to: '31612345678',
      from: 'SMSPit',
      message: 'Hello World',
    });
    expect(result).toEqual({
      id: 'sms_abc123',
      originator: 'SMSPit',
      body: 'Hello World',
      recipients: { totalCount: 1, totalSentCount: 1, items: [{ recipient: '31612345678', status: 'sent' }] },
      createdDatetime: '2026-07-19T00:00:00.000Z',
    });
  });

  it('takes the first recipient from a comma-separated string', async () => {
    messagesService.create.mockResolvedValue(entity);

    await controller.send({ originator: 'SMSPit', recipients: '31612345678,31687654321', body: 'Hello World' });

    expect(messagesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ to: '31612345678' }),
    );
  });

  it('takes the first recipient from an array', async () => {
    messagesService.create.mockResolvedValue(entity);

    await controller.send({ originator: 'SMSPit', recipients: ['31612345678', '31687654321'], body: 'Hello World' });

    expect(messagesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ to: '31612345678' }),
    );
  });

  it('rejects an empty recipients array', async () => {
    await expect(controller.send({ originator: 'SMSPit', recipients: [], body: 'Hi' })).rejects.toThrow(
      BadRequestException,
    );
    expect(messagesService.create).not.toHaveBeenCalled();
  });
});
