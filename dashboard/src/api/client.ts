declare global {
  interface Window {
    __APP_CONFIG__?: { VITE_API_BASE_URL?: string; VITE_API_KEY?: string };
  }
}

// Runtime config (injected by docker-entrypoint.sh at container start)
// takes priority over the build-time env var, since Vite bakes
// import.meta.env values into the bundle at build time -- runtime
// injection is what lets one built image be reused across environments.
const API_BASE_URL =
  window.__APP_CONFIG__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
