export interface ApiRequestOptions extends RequestInit {
  body?: any
}

export async function apiRequest<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = {
    "content-type": "application/json",
    ...(options.headers ?? {}),
  }

  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = payload?.error ?? `Request failed (${response.status})`
    throw new Error(error)
  }

  return payload as T
}
