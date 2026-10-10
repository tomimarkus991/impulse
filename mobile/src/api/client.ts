import { getSession } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export class NetworkError extends Error {}

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

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) throw new ApiError(response.status, data?.error ?? `HTTP ${response.status}`);

  return data as T;
};
