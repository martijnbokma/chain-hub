import type { SecurityScanReport } from "./security.js";

/**
 * Typed hub errors. The HTTP layer maps them to status codes by class,
 * so rewording a message never changes the response status.
 */
export class HubError extends Error {
  readonly status: 400 | 403 | 404 | 409;

  constructor(message: string, status: 400 | 403 | 404 | 409) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

/** The request itself is wrong: empty or unsafe names, unknown kinds, missing SKILL.md, … */
export class InvalidInputError extends HubError {
  constructor(message: string) {
    super(message, 400);
  }
}

/** The named asset, skill or file does not exist. */
export class NotFoundError extends HubError {
  constructor(message: string) {
    super(message, 404);
  }
}

/** The request clashes with current state: name taken, upstream-owned skill, … */
export class ConflictError extends HubError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** The security scan verdict is `fail`; the install/update was blocked before anything was written. */
export class SecurityScanError extends HubError {
  readonly report: SecurityScanReport;

  constructor(report: SecurityScanReport) {
    const summary = report.findings
      .slice(0, 3)
      .map((finding) => `${finding.title}${finding.file ? ` (${finding.file})` : ""}`)
      .join("; ");
    super(
      `Security scan blocked this content: ${summary || "malicious behavior detected"}. ` +
        `Review the findings, or pass allowUnsafe to install anyway.`,
      403
    );
    this.report = report;
  }
}
