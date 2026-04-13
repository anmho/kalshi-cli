import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { loadConfig } from "~/lib/config.js";
import { CliError } from "~/lib/errors.js";
import { DEFAULT_LIMIT } from "~/lib/constants.js";
import type { CommandOverrides, OutputFormat } from "~/lib/types.js";
import { KalshiClient } from "~/lib/kalshi/client.js";

export function parseInteger(value: string, label = "value"): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new CliError(`Invalid ${label}: ${value}`, "validation");
  }
  return parsed;
}

function parseOutputFormat(value: string): OutputFormat {
  const normalized = value.trim().toLowerCase();
  if (normalized !== "table" && normalized !== "wide" && normalized !== "json") {
    throw new CliError(`Unsupported output format "${value}". Use: table, wide, json`, "validation");
  }
  return normalized as OutputFormat;
}

export function addGlobalOptions(command: Command): Command {
  return command
    .option("--config <path>", "Override config file path")
    .option("--base-url <url>", "Kalshi base URL (defaults to elections API)")
    .option("--api-key-id <id>", "Kalshi API key ID")
    .option("--private-key-path <path>", "Path to RSA private key PEM")
    .option("--private-key-pem <pem>", "Inline RSA private key PEM string")
    .option("--timeout-ms <ms>", "HTTP timeout in milliseconds", (value: string) => parseInteger(value, "timeout-ms"))
    .option("-v, --verbose", "Enable verbose request diagnostics to stderr")
    .option("-o, --output <format>", "Output format (table|wide|json)", parseOutputFormat)
    .option("--json", "Alias for -o json");
}

export function withCursorPaging(command: Command, defaultLimit = DEFAULT_LIMIT): Command {
  return command
    .option("--limit <number>", "Result limit", (value: string) => parseInteger(value, "limit"), defaultLimit)
    .option("--cursor <cursor>", "Pagination cursor");
}

export async function clientFromOptions(
  options: CommandOverrides,
  config: { authRequired?: boolean } = {},
): Promise<KalshiClient> {
  const context = await loadConfig(options);
  const client = new KalshiClient({
    apiKeyId: context.config.apiKeyId,
    privateKeyPath: context.config.privateKeyPath,
    privateKeyPem: context.config.privateKeyPem,
    baseUrl: context.config.baseUrl,
    timeoutMs: context.config.timeoutMs,
    verbose: options.verbose ?? process.env.KALSHI_VERBOSE === "1",
  });

  if (config.authRequired !== false && !client.hasAuth()) {
    throw new CliError(
      "Authenticated command requires credentials. Set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY_PATH (or KALSHI_PRIVATE_KEY_PEM), or use `kalshi config set`.",
      "auth",
    );
  }

  return client;
}

export interface KalshiDeps {
  client: KalshiClient;
}

export function withKalshiDeps<TArgs extends unknown[]>(
  createHandler: (deps: KalshiDeps) => (...args: TArgs) => Promise<void>,
  options: { authRequired?: boolean } = {},
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs) => {
    const commandArg = args[args.length - 1];
    if (
      commandArg &&
      typeof commandArg === "object" &&
      "optsWithGlobals" in commandArg &&
      typeof (commandArg as { optsWithGlobals?: unknown }).optsWithGlobals === "function"
    ) {
      const commandOptions = (commandArg as { optsWithGlobals: () => object }).optsWithGlobals();
      const client = await clientFromOptions(commandOptions as CommandOverrides, options);
      return createHandler({ client })(...args);
    }

    const maybeOptions = [...args]
      .reverse()
      .find((value) => value && typeof value === "object" && !("optsWithGlobals" in (value as object)));

    if (!maybeOptions || typeof maybeOptions !== "object") {
      throw new CliError("Unable to resolve command options for dependency injection.", "general");
    }

    const client = await clientFromOptions(maybeOptions as CommandOverrides, options);
    return createHandler({ client })(...args);
  };
}

export function addJsonInputOptions(command: Command, label: string): Command {
  return command
    .option("--file <path>", `Read ${label} from a JSON file`)
    .option("--body <json>", `Provide ${label} as inline JSON`);
}

export async function readJsonInput(options: { file?: string; body?: string }): Promise<unknown> {
  const hasFile = typeof options.file === "string";
  const hasBody = typeof options.body === "string";
  if (hasFile && hasBody) {
    throw new CliError("Use either --file or --body, not both.", "validation");
  }
  if (hasFile) {
    return JSON.parse(await readFile(options.file!, "utf8"));
  }
  if (hasBody) {
    return JSON.parse(options.body!);
  }
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const stdin = Buffer.concat(chunks).toString("utf8").trim();
    if (stdin.length > 0) {
      return JSON.parse(stdin);
    }
  }
  throw new CliError("Provide JSON input with --file, --body, or stdin.", "validation");
}
