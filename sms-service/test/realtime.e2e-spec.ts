import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { WebSocket } from 'ws';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { AuthClient } from './../src/auth/auth-client';

const AUTH_HEADER = { Authorization: 'Bearer sms_live_test.secret' };

describe('Realtime (e2e): WebSocket broadcast on capture', () => {
  let app: INestApplication<App>;
  let port: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClient)
      .useValue({ validateToken: async () => ({ id: 1, name: 'test', owner_id: 1, scopes: [] }) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.listen(0);
    const url = new URL(await app.getUrl());
    port = Number(url.port);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a WebSocket connection with no token', (done) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    socket.on('close', (code) => {
      expect(code).toBe(4001);
      done();
    });
  });

  it('broadcasts a message.created event to authenticated clients on capture', (done) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=sms_live_test.secret`);

    socket.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString());
      expect(parsed.event).toBe('sms.messages.created');
      expect(parsed.data).toMatchObject({ to: '+8801700000097', from: 'SMSPit', message: 'ws e2e capture' });
      socket.close();

      request(app.getHttpServer())
        .delete('/api/v1/messages')
        .set(AUTH_HEADER)
        .send({ ids: [parsed.data.id] })
        .expect(200)
        .then(() => done())
        .catch(done);
    });

    socket.on('open', () => {
      request(app.getHttpServer())
        .post('/api/v1/messages')
        .set(AUTH_HEADER)
        .send({ to: '+8801700000097', from: 'SMSPit', message: 'ws e2e capture' })
        .expect(201)
        .catch(done);
    });
  });
});
