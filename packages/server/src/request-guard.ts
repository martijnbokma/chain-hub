import type { MiddlewareHandler } from "hono";

export type RequestGuardOptions = {
  /** Extra browser origins allowed to call mutating API routes (e.g. the Vite dev server). */
  allowedOrigins?: string[];
  /** Accept any loopback origin (any port). Dev only — lets the Vite proxy port float. */
  allowLoopbackOrigins?: boolean;
};

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function parseHostname(host: string): string | null {
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && LOOPBACK_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

function hasBody(headers: Headers): boolean {
  const length = headers.get("content-length");
  if (length !== null) {
    return Number(length) > 0;
  }
  return headers.has("transfer-encoding");
}

/**
 * Protects the local hub API from other websites and other machines:
 * - Host must be a loopback name (blocks DNS rebinding).
 * - Cross-site browser requests are rejected (Sec-Fetch-Site).
 * - Mutating requests must come from the hub's own origin (or an allowed one) and,
 *   when they carry a body, use `application/json` so no CORS "simple request"
 *   (form or text/plain POST) can reach a route.
 * Clients without Origin/Sec-Fetch-Site headers (CLI, curl) are not browsers and pass.
 */
export function requestGuard(options: RequestGuardOptions = {}): MiddlewareHandler {
  const allowedOrigins = new Set(options.allowedOrigins ?? []);

  return async (context, next) => {
    // @hono/node-server builds the request URL from the Host header, so this is the Host the client sent.
    const host = new URL(context.req.url).host;
    const hostname = parseHostname(host);

    if (!hostname || !LOOPBACK_HOSTNAMES.has(hostname)) {
      return context.json({ error: "Forbidden host" }, 403);
    }

    if (!context.req.path.startsWith("/api/")) {
      return next();
    }

    if (context.req.header("sec-fetch-site") === "cross-site") {
      return context.json({ error: "Cross-site requests are not allowed" }, 403);
    }

    if (SAFE_METHODS.has(context.req.method)) {
      return next();
    }

    const origin = context.req.header("origin");
    if (origin !== undefined) {
      const allowed =
        origin === `http://${host}` ||
        allowedOrigins.has(origin) ||
        (options.allowLoopbackOrigins === true && isLoopbackOrigin(origin));

      if (!allowed) {
        return context.json({ error: "Origin not allowed" }, 403);
      }
    }

    if (hasBody(context.req.raw.headers)) {
      const contentType = context.req.header("content-type") ?? "";
      if (!/^application\/json\b/i.test(contentType)) {
        return context.json({ error: "Content-Type must be application/json" }, 415);
      }
    }

    return next();
  };
}
