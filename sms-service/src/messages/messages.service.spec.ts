import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessagesService } from './messages.service';
import { Message, MessageStatus } from './entities/message.entity';

describe('MessagesService', () => {
  let service: MessagesService;
  let repository: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repository = { create: jest.fn(), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagesService, { provide: getRepositoryToken(Message), useValue: repository }],
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
  });
});
