import './tracing'; // Must be the first import -- see tracing.ts.
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MetricsService } from './metrics/metrics.service';
import { metricsMiddleware } from './metrics/metrics.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Provider-compatible adapters (Day 51+) mimic each real provider's own
  // relative path exactly (e.g. MessageBird's /messages) -- excluded from
  // the versioned prefix since they aren't part of the native API, see
  // docs/api/provider-compatibility.md#url-path-convention.
  // /metrics (Day 84) is excluded the same way -- a scrape target, not
  // part of the versioned API surface.
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'providers/(.*)', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.GET },
    ],
  });
  app.use(metricsMiddleware(app.get(MetricsService)));
  // Dashboard runs on a different origin/port; scope this to specific
  // origins once auth (Day 34+) makes credentialed cross-origin
  // requests a real security concern.
  // exposedHeaders: only "simple" response headers (Content-Type etc.)
  // are readable by cross-origin JS by default -- without this, the
  // export endpoint's filename (Day 64) silently falls back to a
  // generic one since apiFetchBlob can't read Content-Disposition.
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*', exposedHeaders: ['Content-Disposition'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  // Raw `ws` rather than socket.io -- a plain browser WebSocket client
  // (Day 46) can talk to it directly, no client library needed.
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
