import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message, MessageStatus } from './entities/message.entity';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn() };

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
});
