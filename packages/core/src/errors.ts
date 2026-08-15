export class StackglassError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "StackglassError";
    this.code = code;
    this.details = details;
  }
}

export class CancelledError extends StackglassError {
  constructor(message = "Operation cancelled") {
    super("CANCELLED", message);
    this.name = "CancelledError";
  }
}

export class ProjectNotFoundError extends StackglassError {
  constructor(root: string) {
    super("PROJECT_NOT_FOUND", `No project found at ${root}`, { root });
    this.name = "ProjectNotFoundError";
  }
}

export class AdapterError extends StackglassError {
  constructor(adapterId: string, message: string) {
    super("ADAPTER_ERROR", message, { adapterId });
    this.name = "AdapterError";
  }
}

export function isStackglassError(error: unknown): error is StackglassError {
  return error instanceof StackglassError;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
