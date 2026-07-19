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
  // Tracks each authenticated client's org_id so broadcasts can be
  // scoped the same way REST queries are (see docs/multi-tenancy.md) --
  // without this, every connected client would see every org's
  // messages regardless of which key they authenticated with.
  private readonly authenticatedClients = new Map<WebSocket, number | null>();

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

    this.authenticatedClients.set(client, apiKey.org_id);
    this.logger.log(`WebSocket client connected (api key ${apiKey.id}, org ${apiKey.org_id ?? 'none'})`);
  }

  handleDisconnect(client: WebSocket): void {
    this.authenticatedClients.delete(client);
  }

  broadcastMessageCreated(message: Message): void {
    const payload = JSON.stringify({
      event: 'sms.messages.created',
      data: MessageResponseDto.fromEntity(message),
    });

    for (const [client, orgId] of this.authenticatedClients) {
      if (client.readyState === WebSocket.OPEN && orgId === message.orgId) {
        client.send(payload);
      }
    }
  }
}
