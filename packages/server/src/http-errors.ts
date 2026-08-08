import type { Context } from "hono";

type IssueCarrier = {
  issues: Array<{ message: string }>;
};

function hasZodIssues(error: unknown): error is IssueCarrier {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  );
}

/** Map Zod-like issue bags to a single user-facing message, or null if not applicable. */
export function messageFromZodIssues(error: unknown, fallback: string): string | null {
  if (!hasZodIssues(error)) {
    return null;
  }

  return error.issues.map((issue) => issue.message).join("; ") || fallback;
}

export type JsonErrorResult = {
  error: string;
  status: 400 | 500;
};

/**
 * Shared create/rename-style error mapping: Zod issues → 400, known Error messages → 400/500.
 */
export function jsonErrorFromUnknown(
  error: unknown,
  options: {
    zodFallback: string;
    unknownFallback: string;
    clientMessagePattern?: RegExp;
  }
): JsonErrorResult {
  const zodMessage = messageFromZodIssues(error, options.zodFallback);
  if (zodMessage !== null) {
    return { error: zodMessage, status: 400 };
  }

  if (error instanceof Error) {
    const pattern = options.clientMessagePattern ?? /already exists|cannot be empty/i;
    const status = pattern.test(error.message) ? 400 : 500;
    return { error: error.message, status };
  }

  return { error: options.unknownFallback, status: 500 };
}

export function respondWithMappedError(
  context: Context,
  error: unknown,
  options: {
    zodFallback: string;
    unknownFallback: string;
    clientMessagePattern?: RegExp;
  }
) {
  const mapped = jsonErrorFromUnknown(error, options);
  return context.json({ error: mapped.error }, mapped.status);
}
