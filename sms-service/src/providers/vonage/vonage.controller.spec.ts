import { Test, TestingModule } from '@nestjs/testing';
import { VonageController } from './vonage.controller';
import { MessagesService } from '../../messages/messages.service';
import { Message, MessageStatus } from '../../messages/entities/message.entity';

describe('VonageController', () => {
  let controller: VonageController;
  let messagesService: { create: jest.Mock };

  beforeEach(async () => {
    messagesService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VonageController],
      providers: [{ provide: MessagesService, useValue: messagesService }],
    }).compile();

    controller = module.get(VonageController);
  });

  it('translates a Vonage sms/json payload to a capture call', async () => {
    const entity: Message = {
      id: 'sms_abc123',
      to: '31612345678',
      from: 'SMSPit',
      body: 'Hello from Vonage',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    messagesService.create.mockResolvedValue(entity);

    const result = await controller.send({
      from: 'SMSPit',
      to: '31612345678',
      text: 'Hello from Vonage',
    });

    expect(messagesService.create).toHaveBeenCalledWith({
      to: '31612345678',
      from: 'SMSPit',
      message: 'Hello from Vonage',
    });
    expect(result).toEqual({
      'message-count': '1',
      messages: [{ to: '31612345678', 'message-id': 'sms_abc123', status: '0' }],
    });
  });

  it('ignores api_key/api_secret rather than rejecting the request', async () => {
    const entity: Message = {
      id: 'sms_abc123',
      to: '31612345678',
      from: 'SMSPit',
      body: 'hi',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    messagesService.create.mockResolvedValue(entity);

    // api_key/api_secret would be present on the raw request body in
    // practice; the DTO/whitelist strips them before they reach here, so
    // this just confirms the handler doesn't require them as arguments.
    await controller.send({ from: 'SMSPit', to: '31612345678', text: 'hi' });

    expect(messagesService.create).toHaveBeenCalled();
  });
});
