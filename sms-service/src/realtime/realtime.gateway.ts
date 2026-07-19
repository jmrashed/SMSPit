import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import { WebSocket, type Server } from 'ws';
import { AuthClient } from '../auth/auth-client';
import { MessageResponseDto } from '../messages/dto/message-response.dto';
import type { Message } from '../messages/entities/message.entity';

// Browsers can't set custom headers on a WebSocket handshake, so the API
// key travels as a query param instead of an Authorization header --
// validated against the same auth-service endpoint the HTTP guard uses.
@WebSocketGateway({ path: '/ws' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly authenticatedClients = new Set<WebSocket>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly authClient: AuthClient) {}

  async handleConnection(client: WebSocket, request: IncomingMessage): Promise<void> {
    const url = new URL(request.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      client.close(4001, 'Missing token');
      return;
    }

    const apiKey = await this.authClient.validateToken(`Bearer ${token}`);
    if (!apiKey) {
      client.close(4001, 'Invalid or revoked API key');
      return;
    }

    this.authenticatedClients.add(client);
    this.logger.log(`WebSocket client connected (api key ${apiKey.id})`);
  }

  handleDisconnect(client: WebSocket): void {
    this.authenticatedClients.delete(client);
  }

  broadcastMessageCreated(message: Message): void {
    const payload = JSON.stringify({
      event: 'sms.messages.created',
      data: MessageResponseDto.fromEntity(message),
    });

    for (const client of this.authenticatedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}
