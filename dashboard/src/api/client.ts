declare global {
  interface Window {
    __APP_CONFIG__?: { VITE_API_BASE_URL?: string };
  }
}

// Runtime config (injected by docker-entrypoint.sh at container start)
// takes priority over the build-time env var, since Vite bakes
// import.meta.env values into the bundle at build time -- runtime
// injection is what lets one built image be reused across environments.
const API_BASE_URL =
  window.__APP_CONFIG__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
