/** Error thrown for any non-2xx response or network failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly payload?: unknown;

  constructor(status: number, code: string, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** HTTP status of an error, or 0 when it isn't an API error. */
export function statusOf(error: unknown): number {
  return isApiError(error) ? error.status : 0;
}
