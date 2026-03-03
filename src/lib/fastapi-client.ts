type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/backend";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE_PATH}${normalizePath(path)}`, "http://localhost");
  if (!query) {
    return `${url.pathname}${url.search}`;
  }

  Object.entries(query).forEach(([key, raw]) => {
    if (Array.isArray(raw)) {
      raw.forEach((value) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
      return;
    }

    if (raw !== null && raw !== undefined) {
      url.searchParams.append(key, String(raw));
    }
  });

  return `${url.pathname}${url.search}`;
}

export async function apiFetch<TResponse = unknown>(
  path: string,
  options: RequestInit & { query?: QueryParams } = {},
): Promise<TResponse> {
  const { query, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: requestHeaders,
    body,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError("FastAPI request failed", response.status, payload);
  }

  return payload as TResponse;
}
