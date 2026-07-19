declare global {
  interface Window {
    __APP_CONFIG__?: { VITE_API_BASE_URL?: string; VITE_API_KEY?: string; VITE_AUTH_SERVICE_URL?: string };
  }
}

// Runtime config (injected by docker-entrypoint.sh at container start)
// takes priority over the build-time env var, since Vite bakes
// import.meta.env values into the bundle at build time -- runtime
// injection is what lets one built image be reused across environments.
const API_BASE_URL =
  window.__APP_CONFIG__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// auth-service isn't yet routed through the same base URL as sms-service
// (see gateway/.env.example) -- called directly for now, same as
// sms-service's own AuthClient does (Day 35).
const AUTH_SERVICE_URL =
  window.__APP_CONFIG__?.VITE_AUTH_SERVICE_URL || import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8000';

// Stop-gap until Day 47's API key management UI exists: sms-service
// requires auth as of Day 35, so the dashboard needs *a* key to
// function. A single env-configured key is not a substitute for
// per-user keys/login -- fine for this self-hosted tool's admin use
// for now, not a long-term auth story.
const API_KEY = window.__APP_CONFIG__?.VITE_API_KEY || import.meta.env.VITE_API_KEY;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// sms-service's WebSocket gateway lives at /ws on the same host as the
// REST API (see sms-service/src/realtime/realtime.gateway.ts) -- it can't
// read an Authorization header (browsers don't allow custom headers on the
// WS handshake), so the key travels as a query param instead.
export function getWebSocketUrl(): string {
  const httpUrl = new URL(API_BASE_URL);
  const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = new URL(`${wsProtocol}//${httpUrl.host}/ws`);
  if (API_KEY) {
    wsUrl.searchParams.set('token', API_KEY);
  }
  return wsUrl.toString();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// api-keys endpoints on auth-service aren't behind the API key guard
// themselves (see auth-service/routes/api.php) -- generating/listing/
// revoking keys is how you'd bootstrap the very first key.
export async function authApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${AUTH_SERVICE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Unlike api-keys, organizations/teams routes (Day 57+) ARE behind the
// api.key middleware (see auth-service/routes/api.php) -- "acting user"
// for these is the configured key's owner (see ValidateApiKey's
// Auth::setUser call), so the same VITE_API_KEY used against sms-service
// doubles as the dashboard's identity here.
export async function authenticatedAuthApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return authApiFetch<T>(path, {
    ...init,
    headers: {
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      ...init?.headers,
    },
  });
}
