const DEFAULT_API_BASE = "https://termmax-strategy-vault-service.onrender.com";

/**
 * In Vite dev, default to same-origin `/termmax-api` so requests go through the dev-server proxy
 * and avoid browser CORS (curl works without CORS; the browser does not).
 * Set `VITE_API_BASE_URL` to a full URL to override (e.g. if your API sends proper CORS headers).
 */
export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL;
  if (typeof env === "string" && env.trim() !== "") {
    return env.trim().replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "/termmax-api";
  }
  return DEFAULT_API_BASE;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
