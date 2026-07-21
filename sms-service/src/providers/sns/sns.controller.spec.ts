import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { SnsController } from './sns.controller';
import { MessagesService } from '../../messages/messages.service';
import { Message, MessageStatus } from '../../messages/entities/message.entity';

function fakeResponse(): jest.Mocked<Pick<Response, 'status' | 'set' | 'send'>> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as jest.Mocked<Pick<Response, 'status' | 'set' | 'send'>>;
}

function fakeRequest(body: Record<string, string>): Request {
  return { body } as Request;
}

describe('SnsController', () => {
  let controller: SnsController;
  let messagesService: { create: jest.Mock };

  beforeEach(async () => {
    messagesService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnsController],
      providers: [{ provide: MessagesService, useValue: messagesService }],
    }).compile();

    controller = module.get(SnsController);
  });

  it('translates a direct-to-phone Publish action into a capture call and returns XML', async () => {
    const entity: Message = {
      id: 'sms_abc123',
      to: '+15551234567',
      from: 'SMSPit',
      body: 'Hello from SNS',
      otp: null,
      category: null,
      isSpam: null,
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      orgId: null,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    messagesService.create.mockResolvedValue(entity);
    const res = fakeResponse();

    await controller.publish(
      fakeRequest({ Action: 'Publish', PhoneNumber: '+15551234567', Message: 'Hello from SNS' }),
      res as unknown as Response,
    );

    expect(messagesService.create).toHaveBeenCalledWith(
      {
        to: '+15551234567',
        from: 'SMSPit',
        message: 'Hello from SNS',
      },
      null,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/xml');
    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('<PublishResponse');
    expect(xml).toContain('<MessageId>sms_abc123</MessageId>');
  });

  it('rejects actions other than Publish with an XML error', async () => {
    const res = fakeResponse();

    await controller.publish(fakeRequest({ Action: 'ListTopics' }), res as unknown as Response);

    expect(messagesService.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('<ErrorResponse');
    expect(xml).toContain('InvalidAction');
  });

  it('rejects topic-based Publish (TopicArn) with an XML error', async () => {
    const res = fakeResponse();

    await controller.publish(
      fakeRequest({ Action: 'Publish', TopicArn: 'arn:aws:sns:us-east-1:123:my-topic', Message: 'hi' }),
      res as unknown as Response,
    );

    expect(messagesService.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain('InvalidParameter');
  });

  it('rejects a Publish missing PhoneNumber or Message', async () => {
    const res = fakeResponse();

    await controller.publish(fakeRequest({ Action: 'Publish', PhoneNumber: '+15551234567' }), res as unknown as Response);

    expect(messagesService.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
