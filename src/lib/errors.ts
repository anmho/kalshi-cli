export type ErrorKind = "validation" | "auth" | "network" | "api" | "general";

const EXIT_CODES: Record<ErrorKind, number> = {
  validation: 2,
  auth: 3,
  network: 4,
  api: 5,
  general: 1,
};

export class CliError extends Error {
  readonly kind: ErrorKind;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(message: string, kind: ErrorKind = "general", details?: unknown) {
    super(message);
    this.name = "CliError";
    this.kind = kind;
    this.exitCode = EXIT_CODES[kind];
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function pickApiMessage(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined;

  const direct = data.message ?? data.error ?? data.details;
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct;
  }

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (isRecord(first) && typeof first.message === "string") return first.message;
  }

  return undefined;
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) return error;

  const maybe = error as {
    message?: unknown;
    code?: unknown;
    response?: { status?: number; data?: unknown };
  };

  if (maybe?.response?.status) {
    const status = maybe.response.status;
    const apiMessage = pickApiMessage(maybe.response.data);
    const prefix = `Kalshi API request failed (${status})`;
    if (status === 401 || status === 403) {
      return new CliError(
        `${prefix}. Check API key ID and private key credentials.${apiMessage ? ` ${apiMessage}` : ""}`,
        "auth",
        maybe.response.data,
      );
    }
    return new CliError(`${prefix}.${apiMessage ? ` ${apiMessage}` : ""}`, "api", maybe.response.data);
  }

  const code = typeof maybe?.code === "string" ? maybe.code : "";
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
    return new CliError(`Unable to reach Kalshi API (${code}).`, "network");
  }

  const message = typeof maybe?.message === "string" ? maybe.message : "Unexpected error.";
  return new CliError(message, "general");
}
