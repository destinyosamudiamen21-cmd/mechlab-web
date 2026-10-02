import { clearToken, getToken } from "./token";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// A real error class, so screens can tell "not found" (404) apart from
// "server unreachable" and show the right message for each.
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// FastAPI sends errors in "detail": a sentence for our own errors,
// or a list of problems when the submitted data fails validation.
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => item.msg).filter(Boolean);
      if (messages.length > 0) return messages.join(". ");
    }
  } catch {
    // body wasn't JSON; fall through to the default message
  }
  return `Request failed (${response.status})`;
}

export async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      // Logged-in users send their token on every request.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    // A 401 while holding a token means it expired or was revoked: log out cleanly.
    if (response.status === 401 && token) clearToken();
    throw new ApiError(response.status, await errorMessage(response));
  }

  return response.json() as Promise<T>;
}

// Sends data to the API as JSON (used for checking answers, registering, posting).
export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Sends data as a classic web form. The login endpoint requires this format.
export function postForm<T>(
  path: string,
  fields: Record<string, string>
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: new URLSearchParams(fields),
  });
}
