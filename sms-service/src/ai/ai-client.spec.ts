import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiClient } from './ai-client';

describe('AiClient', () => {
  let client: AiClient;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    process.env.AI_SERVICE_URL = 'http://localhost:8001';

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AiClient],
    }).compile();

    client = module.get(AiClient);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.AI_SERVICE_URL;
  });

  it('returns the detected OTP when ai-service responds ok', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ detected: true, otp: '845231' }) } as Response);

    const result = await client.detectOtp('Your OTP is 845231');

    expect(result).toBe('845231');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8001/detect-otp',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ message: 'Your OTP is 845231' }) }),
    );
  });

  it('returns null when ai-service responds with a non-ok status', async () => {
    fetchSpy.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    const result = await client.detectOtp('hi');

    expect(result).toBeNull();
  });

  it('returns null (rather than throwing) when ai-service is unreachable', async () => {
    fetchSpy.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await client.detectOtp('hi');

    expect(result).toBeNull();
  });

  it('returns the classification category when ai-service responds ok', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ category: 'marketing' }) } as Response);

    const result = await client.classify('Huge sale, 50% off!');

    expect(result).toBe('marketing');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8001/classify',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ message: 'Huge sale, 50% off!' }) }),
    );
  });

  it('returns null classification when ai-service is unreachable', async () => {
    fetchSpy.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await client.classify('hi');

    expect(result).toBeNull();
  });

  it('returns the spam verdict when ai-service responds ok', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ is_spam: true, score: 0.9 }) } as Response);

    const result = await client.detectSpam('CONGRATULATIONS! You WON!!!');

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8001/detect-spam',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ message: 'CONGRATULATIONS! You WON!!!' }) }),
    );
  });

  it('returns null spam verdict when ai-service is unreachable', async () => {
    fetchSpy.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await client.detectSpam('hi');

    expect(result).toBeNull();
  });

  it('returns null when AI_SERVICE_URL is not configured, without calling fetch', async () => {
    delete process.env.AI_SERVICE_URL;
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      providers: [AiClient],
    }).compile();
    const unconfiguredClient = module.get(AiClient);

    const result = await unconfiguredClient.detectOtp('hi');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
