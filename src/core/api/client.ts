export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { bearerToken?: string } = {},
): Promise<T> {
  const { bearerToken, headers, ...rest } = options;
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (bearerToken) {
    mergedHeaders.Authorization = `Bearer ${bearerToken}`;
  }

  const res = await fetch(path.startsWith('/') ? path : `/${path}`, {
    ...rest,
    headers: mergedHeaders,
  });

  const payload = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !payload?.ok) {
    throw new ApiClientError(
      payload?.error?.message || `HTTP ${res.status}`,
      res.status,
      payload?.error?.code || 'HTTP_ERROR',
    );
  }

  return payload.data as T;
}
