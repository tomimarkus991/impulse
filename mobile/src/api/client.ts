import { setSyncState } from "../sync/syncState";
import { clearSession, getSession } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

/** Base URL of the API, or undefined when this build isn't configured for one. */
export const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || undefined;

type Init = { method?: "GET" | "POST" | "PUT"; body?: unknown };

export const apiFetch = async <T = unknown>(path: string, { method = "GET", body }: Init = {}) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new NetworkError("API URL is not configured");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new NetworkError(String(error));
  }

  // Proxies can answer with HTML (e.g. a 502 page); never lose the status over a parse error
  let data: unknown = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (response.status === 401 && token) {
    // The token expired or was revoked: sign out so the UI asks the user to sign in again
    clearSession();
    setSyncState({ signedOutByServer: true });
  }
  if (!response.ok)
    throw new ApiError(
      response.status,
      (data as { error?: string } | null)?.error ?? `HTTP ${response.status}`
    );

  return data as T;
};
