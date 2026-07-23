import { ApiError, Client } from './index.js';

const sampleMessage = {
  id: 'sms_abc123',
  to: '+8801700000000',
  from: 'SMSPit',
  message: 'Your OTP is 123456',
  status: 'captured',
  otp: '123456',
  category: 'otp',
  is_spam: false,
  replayed_from: null,
  org_id: null,
  created_at: '2026-07-24T00:00:00.000Z',
};

function fakeFetch(status: number, body: unknown): { fetchFn: typeof fetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchFn = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe('Client', () => {
  it('send() posts the payload and returns a message', async () => {
    const { fetchFn, calls } = fakeFetch(201, sampleMessage);
    const client = new Client({ baseUrl: 'http://localhost:8080', apiKey: 'sms_live_x.y', fetchFn });

    const message = await client.send('+8801700000000', 'SMSPit', 'Your OTP is 123456');

    expect(message.id).toBe('sms_abc123');
    expect(message.otp).toBe('123456');
    expect(calls[0].url).toBe('http://localhost:8080/api/v1/messages');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({
      to: '+8801700000000',
      from: 'SMSPit',
      message: 'Your OTP is 123456',
    });
  });

  it('list() passes filters as query params and returns the envelope', async () => {
    const { fetchFn, calls } = fakeFetch(200, { messages: [sampleMessage], total: 1, limit: 20, offset: 0 });
    const client = new Client({ baseUrl: 'http://localhost:8080', apiKey: 'sms_live_x.y', fetchFn });

    const result = await client.list({ to: '+8801700000000', limit: 20 });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].id).toBe('sms_abc123');
    expect(result.total).toBe(1);
    expect(calls[0].url).toBe('http://localhost:8080/api/v1/messages?to=%2B8801700000000&limit=20');
  });

  it('get() fetches a single message by id', async () => {
    const { fetchFn, calls } = fakeFetch(200, sampleMessage);
    const client = new Client({ baseUrl: 'http://localhost:8080', apiKey: 'sms_live_x.y', fetchFn });

    const message = await client.get('sms_abc123');

    expect(calls[0].url).toBe('http://localhost:8080/api/v1/messages/sms_abc123');
    expect(message.id).toBe('sms_abc123');
  });

  it('replay() posts to the replay endpoint', async () => {
    const replayed = { ...sampleMessage, id: 'sms_def456', replayed_from: 'sms_abc123' };
    const { fetchFn, calls } = fakeFetch(201, replayed);
    const client = new Client({ baseUrl: 'http://localhost:8080', apiKey: 'sms_live_x.y', fetchFn });

    const message = await client.replay('sms_abc123');

    expect(calls[0].url).toBe('http://localhost:8080/api/v1/messages/sms_abc123/replay');
    expect(calls[0].init?.method).toBe('POST');
    expect(message.replayed_from).toBe('sms_abc123');
  });

  it('throws ApiError for non-2xx responses', async () => {
    const { fetchFn } = fakeFetch(404, { code: 'NOT_FOUND', message: 'Message not found', details: null });
    const client = new Client({ baseUrl: 'http://localhost:8080', apiKey: 'sms_live_x.y', fetchFn });

    await expect(client.get('sms_missing')).rejects.toThrow(ApiError);
    await expect(client.get('sms_missing')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Message not found',
    });
  });
});
