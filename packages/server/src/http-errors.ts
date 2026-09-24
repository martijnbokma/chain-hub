import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { HubError } from "@chain-hub/contracts";
import { AiProviderError } from "@chain-hub/domain";

type IssueCarrier = {
  issues: Array<{ message: string; path?: Array<string | number> }>;
};

function hasZodIssues(error: unknown): error is IssueCarrier {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  );
}

function messageFromZodIssues(error: IssueCarrier): string {
  const messages = error.issues.map((issue) =>
    issue.path && issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message
  );
  return messages.join("; ") || "Invalid request";
}

export type ErrorResponse = {
  error: string;
  status: 400 | 404 | 409 | 500 | 502 | 504;
};

/**
 * Single mapping from thrown errors to JSON responses:
 * Zod issues and malformed JSON → 400, typed hub errors → their status,
 * AI provider errors → their status, anything else → a generic 500.
 */
export function toErrorResponse(error: unknown): ErrorResponse {
  if (hasZodIssues(error)) {
    return { error: messageFromZodIssues(error), status: 400 };
  }

  if (error instanceof SyntaxError) {
    return { error: "Request body must be valid JSON", status: 400 };
  }

  if (error instanceof HubError) {
    return { error: error.message, status: error.status };
  }

  if (error instanceof AiProviderError) {
    const status = error.status === 502 || error.status === 504 ? error.status : 400;
    return { error: error.message, status };
  }

  return { error: "Something went wrong in the hub. Check the server log for details.", status: 500 };
}

export function handleError(error: unknown, context: Context) {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  const mapped = toErrorResponse(error);
  if (mapped.status === 500) {
    console.error("[chain-hub] unhandled error:", error);
  }
  return context.json({ error: mapped.error }, mapped.status);
}
