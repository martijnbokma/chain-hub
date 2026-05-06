import { UserError } from "../utils/errors"

export interface ApiErrorShape {
  error: string
  code: string
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

export function jsonError(status: number, error: string, code: string): Response {
  const payload: ApiErrorShape = { error, code }
  return json(payload, status)
}

export function mapError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof UserError) {
    const message = error.message
    if (message.toLowerCase().includes("not found")) {
      return { status: 404, code: "not_found", message }
    }
    return { status: 400, code: "bad_request", message }
  }

  if (error instanceof SyntaxError) {
    return { status: 400, code: "invalid_json", message: "Request body must be valid JSON." }
  }

  if (error instanceof Error) {
    return { status: 500, code: "internal_error", message: error.message }
  }

  return { status: 500, code: "internal_error", message: String(error) }
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new UserError("Expected Content-Type: application/json.")
  }
  const data = await request.json()
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new UserError("JSON request body must be an object.")
  }
  return data as Record<string, unknown>
}
