import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthClient, ValidatedApiKey } from './auth-client';

declare module 'express' {
  interface Request {
    apiKey?: ValidatedApiKey;
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly authClient: AuthClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const apiKey = await this.authClient.validateToken(authorization);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    request.apiKey = apiKey;
    return true;
  }
}
