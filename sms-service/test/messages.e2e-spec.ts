import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

describe('Messages (e2e): capture -> list -> detail', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      .query({ to: '+8801700000099' })
      .expect(200);

    expect(listRes.body.messages.some((m: { id: string }) => m.id === id)).toBe(true);

    const detailRes = await request(app.getHttpServer()).get(`/api/v1/messages/${id}`).expect(200);

    expect(detailRes.body).toMatchObject({
      id,
      to: '+8801700000099',
      message: 'e2e capture -> list -> detail',
    });

    await request(app.getHttpServer()).delete('/api/v1/messages').send({ ids: [id] }).expect(200);
  });

  it('returns 404 for a detail lookup on an unknown id', () => {
    return request(app.getHttpServer()).get('/api/v1/messages/sms_does_not_exist').expect(404);
  });
});
