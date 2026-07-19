import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ValidatedApiKey {
  id: number;
  name: string;
  owner_id: number;
  scopes: string[];
}

// Calls auth-service directly, per Day 35's design. Once gateway
// exists (Day 37+) and enforces auth at the edge (Day 39), this may
// become redundant with the identity gateway already passed downstream
// via headers -- kept for now since sms-service must be safe to call
// directly during v0.2.
@Injectable()
export class AuthClient {
  constructor(private readonly config: ConfigService) {}

  async validateToken(authorizationHeader: string): Promise<ValidatedApiKey | null> {
    const baseUrl = this.config.get<string>('AUTH_SERVICE_URL', 'http://localhost:8000');

    const response = await fetch(`${baseUrl}/api/api-keys/validate`, {
      headers: { Authorization: authorizationHeader },
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<ValidatedApiKey>;
  }
}
