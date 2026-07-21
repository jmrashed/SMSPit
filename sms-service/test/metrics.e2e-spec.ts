import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { AuthClient } from './../src/auth/auth-client';
import { MetricsService } from './../src/metrics/metrics.service';
import { metricsMiddleware } from './../src/metrics/metrics.middleware';

const AUTH_HEADER = { Authorization: 'Bearer sms_live_test.secret' };

describe('Metrics (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClient)
      .useValue({ validateToken: async () => ({ id: 1, name: 'test', owner_id: 1, org_id: null, scopes: [] }) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'metrics', method: RequestMethod.GET }],
    });
    app.use(metricsMiddleware(app.get(MetricsService)));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('is reachable outside the /api/v1 prefix', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(res.headers['content-type']).toContain('text/plain');
  });

  it('counts a real request against sms_service_http_requests_total, labeled by matched route', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(AUTH_HEADER)
      .send({ to: '+8801700000095', from: 'SMSPit', message: 'e2e metrics' })
      .expect(201);

    const res = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(res.text).toContain('sms_service_http_requests_total');
    expect(res.text).toMatch(/route="\/api\/v1\/messages"/);
    expect(res.text).toContain('sms_service_http_request_duration_seconds');
  });

  it('exposes Node.js default process metrics alongside the custom ones', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  it('counts a captured message against messages_captured_total, labeled by its classified category', async () => {
    // ai-service isn't running in this test env, so classify()/detectOtp()
    // degrade to null (Days 68/71's non-blocking behavior) -- category
    // lands as "unknown" here, not "otp". The point of this test is the
    // metric wiring, not ai-service's classification accuracy (covered
    // by ai-service's own test suite).
    await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(AUTH_HEADER)
      .send({ to: '+8801700000094', from: 'SMSPit', message: 'Your OTP is 445566' })
      .expect(201);

    const res = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(res.text).toContain('sms_service_messages_captured_total');
    expect(res.text).toMatch(/sms_service_messages_captured_total\{category="[^"]+"\} \d/);
    expect(res.text).toContain('sms_service_otp_detected_total');
  });
});
