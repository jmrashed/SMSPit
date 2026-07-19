import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthClient } from './auth-client';

describe('AuthClient', () => {
  let client: AuthClient;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AuthClient],
    }).compile();

    client = module.get(AuthClient);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns the parsed key when auth-service responds ok', async () => {
    const apiKey = { id: 1, name: 'test', owner_id: 1, scopes: [] };
    fetchSpy.mockResolvedValue({ ok: true, json: async () => apiKey } as Response);

    const result = await client.validateToken('Bearer sms_live_x.y');

    expect(result).toEqual(apiKey);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/api-keys/validate'),
      expect.objectContaining({ headers: { Authorization: 'Bearer sms_live_x.y' } }),
    );
  });

  it('returns null when auth-service responds with a non-ok status', async () => {
    fetchSpy.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    const result = await client.validateToken('Bearer sms_live_x.bad');

    expect(result).toBeNull();
  });
});
