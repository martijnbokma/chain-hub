/**
 * Typed hub errors. The HTTP layer maps them to status codes by class,
 * so rewording a message never changes the response status.
 */
export class HubError extends Error {
  readonly status: 400 | 404 | 409;

  constructor(message: string, status: 400 | 404 | 409) {
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
