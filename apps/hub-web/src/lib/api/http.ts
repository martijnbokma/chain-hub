/**
 * Generic function to fetch JSON data from an API endpoint
 */
export async function getJson<T>(url: string): Promise<T> {
  return parseJsonResponse<T>(await fetch(url));
}

/**
 * Sends a JSON request and returns the parsed response. Failed requests throw an
 * Error carrying the hub's { error } message, so callers need no response checks.
 */
export async function sendJson<T>(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  });

  return parseJsonResponse<T>(response);
}

/** Returns the JSON body, or throws with the hub's { error } message instead of a bare status code. */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** User-facing message for a failed request or mutation, with a fallback for non-Error values. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
