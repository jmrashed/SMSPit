import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { AuthClient } from './../src/auth/auth-client';

// Provider adapters themselves need no SMSPit auth (see
// docs/api/provider-compatibility.md#auth) -- AuthClient is only stubbed
// here so afterAll can clean up via the native (authenticated) delete
// endpoint, same as messages.e2e-spec.ts.
describe('Providers (e2e)', () => {
  let app: INestApplication<App>;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClient)
      .useValue({ validateToken: async () => ({ id: 1, name: 'test', owner_id: 1, org_id: null, scopes: [] }) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: [{ path: 'providers/(.*)', method: RequestMethod.ALL }] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await request(app.getHttpServer())
        .delete('/api/v1/messages')
        .set('Authorization', 'Bearer sms_live_test.secret')
        .send({ ids: createdIds });
    }
    await app.close();
  });

  describe('MessageBird adapter', () => {
    it('is not reachable under the versioned /api/v1 prefix', () => {
      return request(app.getHttpServer()).post('/api/v1/providers/messagebird/messages').expect(404);
    });

    it('captures a message from a well-formed payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers/messagebird/messages')
        .send({ originator: 'SMSPit', recipients: '31612345678', body: 'e2e messagebird' })
        .expect(201);

      expect(res.body.recipients.items[0].recipient).toBe('31612345678');
      createdIds.push(res.body.id);
    });

    it('rejects a payload missing originator', () => {
      return request(app.getHttpServer())
        .post('/providers/messagebird/messages')
        .send({ recipients: '31612345678', body: 'no originator' })
        .expect(400)
        .expect((res) => {
          if (res.body.code !== 'BAD_REQUEST') throw new Error(`expected BAD_REQUEST, got ${res.body.code}`);
        });
    });

    it('rejects a payload missing body', () => {
      return request(app.getHttpServer())
        .post('/providers/messagebird/messages')
        .send({ originator: 'SMSPit', recipients: '31612345678' })
        .expect(400);
    });

    it('rejects a payload missing recipients', () => {
      return request(app.getHttpServer())
        .post('/providers/messagebird/messages')
        .send({ originator: 'SMSPit', body: 'no recipients' })
        .expect(400);
    });
  });

  describe('Vonage adapter', () => {
    it('captures a message from a form-encoded payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers/vonage/sms/json')
        .type('form')
        .send({ from: 'SMSPit', to: '31612345678', text: 'e2e vonage form' })
        .expect(200);

      expect(res.body.messages[0].status).toBe('0');
      createdIds.push(res.body.messages[0]['message-id']);
    });

    it('captures a message from a JSON payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers/vonage/sms/json')
        .send({ from: 'SMSPit', to: '31612345678', text: 'e2e vonage json' })
        .expect(200);

      createdIds.push(res.body.messages[0]['message-id']);
    });

    it('rejects a payload missing text', () => {
      return request(app.getHttpServer())
        .post('/providers/vonage/sms/json')
        .send({ from: 'SMSPit', to: '31612345678' })
        .expect(400);
    });

    it('rejects a payload missing to/from', () => {
      return request(app.getHttpServer()).post('/providers/vonage/sms/json').send({ text: 'no to/from' }).expect(400);
    });
  });

  describe('SNS adapter', () => {
    it('captures a message from a form-encoded Publish action', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers/sns')
        .type('form')
        .send({ Action: 'Publish', PhoneNumber: '+15551234567', Message: 'e2e sns' })
        .expect(200)
        .expect('Content-Type', /xml/);

      expect(res.text).toContain('<PublishResponse');
      const match = res.text.match(/<MessageId>(.+?)<\/MessageId>/);
      if (match) createdIds.push(match[1]);
    });

    it('rejects an action other than Publish with an XML error', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers/sns')
        .type('form')
        .send({ Action: 'ListTopics' })
        .expect(400)
        .expect('Content-Type', /xml/);

      expect(res.text).toContain('InvalidAction');
    });

    it('rejects a Publish missing PhoneNumber', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers/sns')
        .type('form')
        .send({ Action: 'Publish', Message: 'no phone number' })
        .expect(400);

      expect(res.text).toContain('InvalidParameter');
    });

    it('rejects topic-based Publish', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers/sns')
        .type('form')
        .send({ Action: 'Publish', TopicArn: 'arn:aws:sns:us-east-1:123:my-topic', Message: 'hi' })
        .expect(400);

      expect(res.text).toContain('InvalidParameter');
    });
  });
});
