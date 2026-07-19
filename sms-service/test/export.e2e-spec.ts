import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { AuthClient } from './../src/auth/auth-client';

const AUTH_HEADER = { Authorization: 'Bearer sms_live_test.secret' };
const EXPORT_TO = '+8801700000077';

describe('Messages (e2e): export', () => {
  let app: INestApplication<App>;
  const capturedIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClient)
      .useValue({ validateToken: async () => ({ id: 1, name: 'test', owner_id: 1, org_id: null, scopes: [] }) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();

    for (const body of ['export test one', 'export test two, with a comma']) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set(AUTH_HEADER)
        .send({ to: EXPORT_TO, from: 'SMSPit', message: body })
        .expect(201);
      capturedIds.push(res.body.id as string);
    }
  });

  afterAll(async () => {
    await request(app.getHttpServer()).delete('/api/v1/messages').set(AUTH_HEADER).send({ ids: capturedIds });
    await app.close();
  });

  it('streams a JSON array of the matching messages', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/messages/export')
      .query({ format: 'json', to: EXPORT_TO })
      .set(AUTH_HEADER)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/json');
    const records: Array<{ id: string; message: string }> = JSON.parse(res.text);
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.id).sort()).toEqual([...capturedIds].sort());
    expect(records[0]).toMatchObject({ to: EXPORT_TO, from: 'SMSPit', status: 'captured' });
  });

  it('streams a CSV with a header row and one row per message, escaping embedded commas', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/messages/export')
      .query({ format: 'csv', to: EXPORT_TO })
      .set(AUTH_HEADER)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('id,to,from,message,status,replayed_from,created_at');
    expect(lines).toHaveLength(3);
    expect(lines.some((line) => line.includes('"export test two, with a comma"'))).toBe(true);
  });

  it('defaults to JSON when no format is given', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/messages/export')
      .query({ to: EXPORT_TO })
      .set(AUTH_HEADER)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/json');
    expect(JSON.parse(res.text)).toHaveLength(2);
  });

  it('rejects an unsupported format', () => {
    return request(app.getHttpServer())
      .get('/api/v1/messages/export')
      .query({ format: 'xml' })
      .set(AUTH_HEADER)
      .expect(400);
  });

  it('returns 401 when no Authorization header is sent', () => {
    return request(app.getHttpServer()).get('/api/v1/messages/export').expect(401);
  });
});
