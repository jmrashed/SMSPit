import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import request from 'supertest';
import { App } from 'supertest/types';
import { Client } from 'pg';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { AuthClient } from './../src/auth/auth-client';

const ORG_A_HEADER = { Authorization: 'Bearer org-a-token' };
const ORG_B_HEADER = { Authorization: 'Bearer org-b-token' };
const UNGROUPED_HEADER = { Authorization: 'Bearer ungrouped-token' };

describe('Multi-tenancy (e2e): cross-org data isolation', () => {
  let app: INestApplication<App>;
  let pg: Client;
  let orgAId: number;
  let orgBId: number;

  beforeAll(async () => {
    // messages.org_id is a real FK to organizations.id (see Day 56/59
    // migrations) -- two organizations have to actually exist for a
    // message to be captured under them.
    pg = new Client({
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USERNAME ?? 'smspit',
      password: process.env.DB_PASSWORD ?? 'smspit',
      database: process.env.DB_DATABASE ?? 'smspit_test',
    });
    await pg.connect();
    const orgA = await pg.query(
      "INSERT INTO organizations (name, slug, created_at, updated_at) VALUES ('Org A e2e', 'org-a-e2e-' || floor(random() * 1000000), now(), now()) RETURNING id",
    );
    const orgB = await pg.query(
      "INSERT INTO organizations (name, slug, created_at, updated_at) VALUES ('Org B e2e', 'org-b-e2e-' || floor(random() * 1000000), now(), now()) RETURNING id",
    );
    orgAId = orgA.rows[0].id as number;
    orgBId = orgB.rows[0].id as number;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClient)
      .useValue({
        validateToken: async (authorizationHeader: string) => {
          const token = authorizationHeader.replace('Bearer ', '');
          if (token === 'org-a-token') return { id: 1, name: 'org-a', owner_id: 1, org_id: orgAId, scopes: [] };
          if (token === 'org-b-token') return { id: 2, name: 'org-b', owner_id: 2, org_id: orgBId, scopes: [] };
          if (token === 'ungrouped-token') return { id: 3, name: 'ungrouped', owner_id: 3, org_id: null, scopes: [] };
          return null;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();
  });

  afterAll(async () => {
    // messages.org_id is ON DELETE SET NULL, not CASCADE -- deleting the
    // organizations alone would turn these into "ungrouped" rows instead
    // of removing them, so delete the messages explicitly first.
    await pg.query('DELETE FROM messages WHERE org_id = $1 OR org_id = $2', [orgAId, orgBId]);
    await pg.query('DELETE FROM organizations WHERE id = $1 OR id = $2', [orgAId, orgBId]);
    await pg.end();
    await app.close();
  });

  it('a message captured under org A is not visible when listing as org B', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(ORG_A_HEADER)
      .send({ to: '+8801700000201', from: 'SMSPit', message: 'org a only' })
      .expect(201);
    const orgAMessageId: string = createRes.body.id;
    expect(createRes.body.org_id).toBe(orgAId);

    const orgBList = await request(app.getHttpServer()).get('/api/v1/messages').set(ORG_B_HEADER).expect(200);
    expect(orgBList.body.messages.some((m: { id: string }) => m.id === orgAMessageId)).toBe(false);

    const orgAList = await request(app.getHttpServer()).get('/api/v1/messages').set(ORG_A_HEADER).expect(200);
    expect(orgAList.body.messages.some((m: { id: string }) => m.id === orgAMessageId)).toBe(true);
  });

  it('org B gets 404 fetching a message that belongs to org A', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(ORG_A_HEADER)
      .send({ to: '+8801700000202', from: 'SMSPit', message: 'org a detail' })
      .expect(201);
    const orgAMessageId: string = createRes.body.id;

    await request(app.getHttpServer()).get(`/api/v1/messages/${orgAMessageId}`).set(ORG_B_HEADER).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/messages/${orgAMessageId}`).set(ORG_A_HEADER).expect(200);
  });

  it('org B cannot replay a message that belongs to org A', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(ORG_A_HEADER)
      .send({ to: '+8801700000203', from: 'SMSPit', message: 'org a replay target' })
      .expect(201);
    const orgAMessageId: string = createRes.body.id;

    await request(app.getHttpServer()).post(`/api/v1/messages/${orgAMessageId}/replay`).set(ORG_B_HEADER).expect(404);
  });

  it("org B's bulk delete does not remove org A's messages", async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(ORG_A_HEADER)
      .send({ to: '+8801700000204', from: 'SMSPit', message: 'org a survives' })
      .expect(201);
    const orgAMessageId: string = createRes.body.id;

    await request(app.getHttpServer()).delete('/api/v1/messages').set(ORG_B_HEADER).send({ confirm: true }).expect(200);

    await request(app.getHttpServer()).get(`/api/v1/messages/${orgAMessageId}`).set(ORG_A_HEADER).expect(200);
  });

  it('statistics are scoped per org, not shared', async () => {
    await request(app.getHttpServer()).delete('/api/v1/messages').set(ORG_A_HEADER).send({ confirm: true });
    await request(app.getHttpServer()).delete('/api/v1/messages').set(ORG_B_HEADER).send({ confirm: true });

    await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(ORG_A_HEADER)
      .send({ to: '+8801700000205', from: 'SMSPit', message: 'counted for org a' })
      .expect(201);

    const orgAStats = await request(app.getHttpServer()).get('/api/v1/statistics').set(ORG_A_HEADER).expect(200);
    const orgBStats = await request(app.getHttpServer()).get('/api/v1/statistics').set(ORG_B_HEADER).expect(200);

    expect(orgAStats.body.total).toBe(1);
    expect(orgBStats.body.total).toBe(0);
  });

  it('an ungrouped key (no org_id) only sees ungrouped messages, not org A\'s', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/messages')
      .set(ORG_A_HEADER)
      .send({ to: '+8801700000207', from: 'SMSPit', message: 'org a, not ungrouped' })
      .expect(201);
    const orgAMessageId: string = createRes.body.id;

    const ungroupedList = await request(app.getHttpServer())
      .get('/api/v1/messages')
      .set(UNGROUPED_HEADER)
      .expect(200);

    expect(ungroupedList.body.messages.some((m: { id: string }) => m.id === orgAMessageId)).toBe(false);
  });

  it("org B does not see org A's templates when listing", async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/templates')
      .set(ORG_A_HEADER)
      .send({ name: 'Org A template', body: 'Hello {{name}}', variables: ['name'] })
      .expect(201);
    const orgATemplateId: number = createRes.body.id;

    const orgBList = await request(app.getHttpServer()).get('/api/v1/templates').set(ORG_B_HEADER).expect(200);
    expect(orgBList.body.templates.some((t: { id: number }) => t.id === orgATemplateId)).toBe(false);

    const orgAList = await request(app.getHttpServer()).get('/api/v1/templates').set(ORG_A_HEADER).expect(200);
    expect(orgAList.body.templates.some((t: { id: number }) => t.id === orgATemplateId)).toBe(true);
  });

  it("org B gets 404 fetching, updating, or deleting org A's template", async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/templates')
      .set(ORG_A_HEADER)
      .send({ name: 'Org A only', body: 'Hello {{name}}' })
      .expect(201);
    const orgATemplateId: number = createRes.body.id;

    await request(app.getHttpServer()).get(`/api/v1/templates/${orgATemplateId}`).set(ORG_B_HEADER).expect(404);
    await request(app.getHttpServer())
      .put(`/api/v1/templates/${orgATemplateId}`)
      .set(ORG_B_HEADER)
      .send({ name: 'hijacked' })
      .expect(404);
    await request(app.getHttpServer()).delete(`/api/v1/templates/${orgATemplateId}`).set(ORG_B_HEADER).expect(404);

    // Untouched by org B's failed attempts.
    const stillThere = await request(app.getHttpServer())
      .get(`/api/v1/templates/${orgATemplateId}`)
      .set(ORG_A_HEADER)
      .expect(200);
    expect(stillThere.body.name).toBe('Org A only');
  });
});
