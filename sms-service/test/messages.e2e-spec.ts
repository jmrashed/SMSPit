import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { AuthClient } from './../src/auth/auth-client';

// Auth is stubbed here (unit-tested separately in api-key.guard.spec.ts) --
// this suite exercises message capture/list/detail, not cross-service auth.
const AUTH_HEADER = { Authorization: 'Bearer sms_live_test.secret' };

describe('Messages (e2e): capture -> list -> detail', () => {
  let app: INestApplication<App>;

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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('captures a message, finds it in the list, and fetches its detail', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(AUTH_HEADER)
      .send({ to: '+8801700000099', from: 'SMSPit', message: 'e2e capture -> list -> detail' })
      .expect(201);

    expect(createRes.body).toMatchObject({
      to: '+8801700000099',
      from: 'SMSPit',
      message: 'e2e capture -> list -> detail',
      status: 'captured',
    });
    const id: string = createRes.body.id;
    expect(id).toMatch(/^sms_/);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/messages')
      .set(AUTH_HEADER)
      .query({ to: '+8801700000099' })
      .expect(200);

    expect(listRes.body.messages.some((m: { id: string }) => m.id === id)).toBe(true);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/messages/${id}`)
      .set(AUTH_HEADER)
      .expect(200);

    expect(detailRes.body).toMatchObject({
      id,
      to: '+8801700000099',
      message: 'e2e capture -> list -> detail',
    });

    await request(app.getHttpServer())
      .delete('/api/v1/messages')
      .set(AUTH_HEADER)
      .send({ ids: [id] })
      .expect(200);
  });

  it('returns 404 for a detail lookup on an unknown id', () => {
    return request(app.getHttpServer())
      .get('/api/v1/messages/sms_does_not_exist')
      .set(AUTH_HEADER)
      .expect(404);
  });

  it('returns 401 when no Authorization header is sent', () => {
    return request(app.getHttpServer()).get('/api/v1/messages').expect(401);
  });
});
