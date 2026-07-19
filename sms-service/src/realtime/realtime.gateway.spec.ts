import { Test, TestingModule } from '@nestjs/testing';
import { WebSocket } from 'ws';
import { RealtimeGateway } from './realtime.gateway';
import { AuthClient } from '../auth/auth-client';
import { Message, MessageStatus } from '../messages/entities/message.entity';

function fakeRequest(query: string): { url: string } {
  return { url: `/ws${query}` };
}

function fakeClient(readyState: number = WebSocket.OPEN): { close: jest.Mock; send: jest.Mock; readyState: number } {
  return { close: jest.fn(), send: jest.fn(), readyState };
}

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let authClient: { validateToken: jest.Mock };

  beforeEach(async () => {
    authClient = { validateToken: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeGateway, { provide: AuthClient, useValue: authClient }],
    }).compile();

    gateway = module.get(RealtimeGateway);
  });

  it('closes the connection when no token is provided', async () => {
    const client = fakeClient();

    await gateway.handleConnection(client as unknown as WebSocket, fakeRequest('') as never);

    expect(client.close).toHaveBeenCalledWith(4001, 'Missing token');
    expect(authClient.validateToken).not.toHaveBeenCalled();
  });

  it('closes the connection when the token is invalid', async () => {
    authClient.validateToken.mockResolvedValue(null);
    const client = fakeClient();

    await gateway.handleConnection(client as unknown as WebSocket, fakeRequest('?token=bad') as never);

    expect(authClient.validateToken).toHaveBeenCalledWith('Bearer bad');
    expect(client.close).toHaveBeenCalledWith(4001, 'Invalid or revoked API key');
  });

  it('accepts the connection and later broadcasts to it when the token is valid', async () => {
    authClient.validateToken.mockResolvedValue({ id: 1, name: 'test', owner_id: 1, scopes: [] });
    const client = fakeClient();

    await gateway.handleConnection(client as unknown as WebSocket, fakeRequest('?token=good') as never);
    expect(client.close).not.toHaveBeenCalled();

    const message: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    gateway.broadcastMessageCreated(message);

    expect(client.send).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'sms.messages.created',
        data: {
          id: 'sms_abc123',
          to: '+8801700000000',
          from: 'SMSPit',
          message: 'Your OTP is 845231',
          status: 'captured',
          replayed_from: null,
          created_at: '2026-07-19T00:00:00.000Z',
        },
      }),
    );
  });

  it('does not broadcast to a client that was never authenticated', () => {
    const message: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };

    expect(() => gateway.broadcastMessageCreated(message)).not.toThrow();
  });

  it('stops broadcasting to a client after it disconnects', async () => {
    authClient.validateToken.mockResolvedValue({ id: 1, name: 'test', owner_id: 1, scopes: [] });
    const client = fakeClient();
    await gateway.handleConnection(client as unknown as WebSocket, fakeRequest('?token=good') as never);

    gateway.handleDisconnect(client as unknown as WebSocket);

    const message: Message = {
      id: 'sms_abc123',
      to: '+8801700000000',
      from: 'SMSPit',
      body: 'Your OTP is 845231',
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      createdAt: new Date('2026-07-19T00:00:00.000Z'),
    };
    gateway.broadcastMessageCreated(message);

    expect(client.send).not.toHaveBeenCalled();
  });
});
