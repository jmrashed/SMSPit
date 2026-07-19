import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Provider-compatible adapters (Day 51+) mimic each real provider's own
  // relative path exactly (e.g. MessageBird's /messages) -- excluded from
  // the versioned prefix since they aren't part of the native API, see
  // docs/api/provider-compatibility.md#url-path-convention.
  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'providers/(.*)', method: RequestMethod.ALL }] });
  // Dashboard runs on a different origin/port; scope this to specific
  // origins once auth (Day 34+) makes credentialed cross-origin
  // requests a real security concern.
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  // Raw `ws` rather than socket.io -- a plain browser WebSocket client
  // (Day 46) can talk to it directly, no client library needed.
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
