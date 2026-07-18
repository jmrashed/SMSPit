import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';

// Repository-level test against a real Postgres test database (schema
// created by the auth-service migration, per docs/architecture.md).
// Requires TEST_DB_* env vars pointing at a database with the Day 5
// `messages` migration already run; skipped automatically if unset.
const hasTestDb = !!process.env.TEST_DB_DATABASE;
const describeIfDb = hasTestDb ? describe : describe.skip;

describeIfDb('Message repository (integration)', () => {
  let module: TestingModule;
  let repository: Repository<Message>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST ?? '127.0.0.1',
          port: Number(process.env.TEST_DB_PORT ?? 5432),
          database: process.env.TEST_DB_DATABASE,
          username: process.env.TEST_DB_USERNAME ?? 'smspit',
          password: process.env.TEST_DB_PASSWORD ?? 'smspit',
          entities: [Message],
          synchronize: false,
        }),
        TypeOrmModule.forFeature([Message]),
      ],
    }).compile();

    repository = module.get(getRepositoryToken(Message));
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    await repository.clear();
  });

  it('persists and reads back a message row', async () => {
    const saved = await repository.save(
      repository.create({
        id: 'sms_repo_test_1',
        to: '+8801700000001',
        from: 'SMSPit',
        body: 'Repository test message',
        status: MessageStatus.CAPTURED,
        createdAt: new Date(),
      }),
    );

    const found = await repository.findOneBy({ id: saved.id });

    expect(found).not.toBeNull();
    expect(found?.to).toBe('+8801700000001');
    expect(found?.body).toBe('Repository test message');
    expect(found?.status).toBe(MessageStatus.CAPTURED);
  });

  it('rejects a status outside the captured/failed check constraint', async () => {
    await expect(
      repository.save(
        repository.create({
          id: 'sms_repo_test_2',
          to: '+8801700000002',
          from: 'SMSPit',
          body: 'Invalid status test',
          status: 'bogus' as MessageStatus,
          createdAt: new Date(),
        }),
      ),
    ).rejects.toThrow();
  });

  it('returns rows ordered by created_at descending', async () => {
    await repository.save(
      repository.create({
        id: 'sms_repo_order_older',
        to: '+8801700000003',
        from: 'SMSPit',
        body: 'older',
        status: MessageStatus.CAPTURED,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );
    await repository.save(
      repository.create({
        id: 'sms_repo_order_newer',
        to: '+8801700000003',
        from: 'SMSPit',
        body: 'newer',
        status: MessageStatus.CAPTURED,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    );

    const rows = await repository.find({ order: { createdAt: 'DESC' } });

    expect(rows.map((row) => row.id)).toEqual(['sms_repo_order_newer', 'sms_repo_order_older']);
  });
});
