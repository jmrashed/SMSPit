import { Module } from '@nestjs/common';
import { AuthClient } from './auth-client';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  providers: [AuthClient, ApiKeyGuard],
  exports: [AuthClient, ApiKeyGuard],
})
export class AuthModule {}
