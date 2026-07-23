// Node.js client for SMSPit's native REST API
// (docs/api/message-mapping.md): send, list, get, and replay captured
// messages. Built on the global fetch (Node 18+) -- no third-party
// HTTP dependency.

export interface Message {
  id: string;
  to: string;
  from: string;
  message: string;
  status: string;
  otp: string | null;
  category: string | null;
  is_spam: boolean | null;
  replayed_from: string | null;
  org_id: number | null;
  created_at: string;
}

export interface MessageList {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  to?: string;
  from?: string;
  created_after?: string;
  created_before?: string;
}

interface ErrorEnvelope {
  code: string;
  message: string;
  details: unknown;
}

// Mirrors this project's standard error response shape (code/message/details).
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchFn?: typeof fetch;
}

/**
 * Talks to SMSPit's REST API. Point baseUrl at the gateway (or
 * sms-service directly) and pass the full "{key}.{secret}" API key
 * auth-service issued.
 */
export class Client {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /** POST /api/v1/messages */
  async send(to: string, from: string, message: string): Promise<Message> {
    return this.request<Message>('POST', '/api/v1/messages', { to, from, message });
  }

  /** GET /api/v1/messages */
  async list(params: ListParams = {}): Promise<MessageList> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    const qs = query.toString();
    return this.request<MessageList>('GET', `/api/v1/messages${qs ? `?${qs}` : ''}`);
  }

  /** GET /api/v1/messages/{id} */
  async get(id: string): Promise<Message> {
    return this.request<Message>('GET', `/api/v1/messages/${encodeURIComponent(id)}`);
  }

  /** POST /api/v1/messages/{id}/replay -- re-sends the original payload as a new, linked message. */
  async replay(id: string): Promise<Message> {
    return this.request<Message>('POST', `/api/v1/messages/${encodeURIComponent(id)}/replay`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const parsed: unknown = text.length > 0 ? JSON.parse(text) : {};

    if (!response.ok) {
      const envelope = parsed as Partial<ErrorEnvelope>;
      throw new ApiError(
        response.status,
        envelope.code ?? 'UNKNOWN_ERROR',
        envelope.message ?? 'SMSPit API request failed',
        envelope.details ?? null,
      );
    }

    return parsed as T;
  }
}
