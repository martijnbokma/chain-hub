import type { SecurityScanReport } from "@chain-hub/contracts";

/** Shown when fetch itself fails — the API is unreachable rather than returning an error. */
const UNREACHABLE_MESSAGE = 'Unable to reach the hub API. Check that it is running, then try again.';

/**
 * Generic function to fetch JSON data from an API endpoint
 */
export async function getJson<T>(url: string): Promise<T> {
  return parseJsonResponse<T>(await request(url));
}

/**
 * Sends a JSON request and returns the parsed response. Failed requests throw an
 * Error carrying the hub's { error } message, so callers need no response checks.
 */
export async function sendJson<T>(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  const response = await request(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  });

  return parseJsonResponse<T>(response);
}

/** Fetch wrapper: a refused or dropped connection becomes a readable error instead of a raw TypeError. */
async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await (init === undefined ? fetch(url) : fetch(url, init));
  } catch (error) {
    throw new Error(UNREACHABLE_MESSAGE, { cause: error });
  }
}


/** Thrown when the hub's security gate blocks an install/update (HTTP 403). Carries the scan report. */
export class SecurityBlockedError extends Error {
  readonly scan: SecurityScanReport;

  constructor(message: string, scan: SecurityScanReport) {
    super(message);
    this.name = 'SecurityBlockedError';
    this.scan = scan;
  }
}

/** Returns the JSON body, or throws with the hub's { error } message instead of a bare status code. */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; scan?: SecurityScanReport }
      | null;
    if (response.status === 403 && payload?.scan) {
      throw new SecurityBlockedError(payload.error || 'Security scan blocked this content', payload.scan);
    }
    throw new Error(payload?.error || fallbackMessage(response.status));
  }

  return response.json() as Promise<T>;
}

/**
 * Message for an error response without the hub's { error } body — in practice a
 * proxy-level failure (the Vite dev proxy answers a plain 502 when the API is
 * down or restarting), so translate gateway statuses instead of showing a bare code.
 */
function fallbackMessage(status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return 'The hub API did not respond. It may be restarting. Try again in a moment.';
  }
  return `Request failed: ${status}`;
}

/** User-facing message for a failed request or mutation, with a fallback for non-Error values. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
