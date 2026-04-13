import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { APP_CONFIG_DIR, DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from "~/lib/constants.js";
import type { CliConfig, ConfigContext, CommandOverrides } from "~/lib/types.js";

const configSchema = z.object({
  apiKeyId: z.string().min(1).optional(),
  privateKeyPath: z.string().min(1).optional(),
  privateKeyPem: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

function defaultDataDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim().length > 0) {
    return path.join(xdg, APP_CONFIG_DIR);
  }
  return path.join(homedir(), ".config", APP_CONFIG_DIR);
}

function defaultConfigPath(): string {
  return path.join(defaultDataDir(), "config.json");
}

function envConfig(): CliConfig {
  const timeout = process.env.KALSHI_TIMEOUT_MS;
  const parsedTimeout = timeout ? Number.parseInt(timeout, 10) : undefined;

  return Object.fromEntries(
    Object.entries({
    apiKeyId: process.env.KALSHI_API_KEY_ID || undefined,
    privateKeyPath: process.env.KALSHI_PRIVATE_KEY_PATH || undefined,
    privateKeyPem: process.env.KALSHI_PRIVATE_KEY_PEM || undefined,
    baseUrl: process.env.KALSHI_BASE_URL || undefined,
    timeoutMs: Number.isFinite(parsedTimeout) ? parsedTimeout : undefined,
    }).filter(([, value]) => value !== undefined),
  ) as CliConfig;
}

async function fileConfig(configPath: string): Promise<CliConfig> {
  if (!existsSync(configPath)) return {};
  const raw = await readFile(configPath, "utf8");
  if (raw.trim().length === 0) return {};
  const parsed = JSON.parse(raw);
  return configSchema.partial().parse(parsed);
}

export async function loadConfig(overrides: CommandOverrides = {}): Promise<ConfigContext> {
  const configPath = overrides.config ?? defaultConfigPath();
  const dataDir = path.dirname(configPath);
  const fromFile = await fileConfig(configPath);
  const fromEnv = envConfig();

  const merged: CliConfig = {
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    ...fromFile,
    ...fromEnv,
    ...Object.fromEntries(
      Object.entries({
        apiKeyId: overrides.apiKeyId,
        privateKeyPath: overrides.privateKeyPath,
        privateKeyPem: overrides.privateKeyPem,
        baseUrl: overrides.baseUrl,
        timeoutMs: overrides.timeoutMs,
      }).filter(([, value]) => value !== undefined),
    ),
  };

  return { config: configSchema.partial().parse(merged), configPath, dataDir };
}

export async function ensureConfigDir(context: ConfigContext): Promise<void> {
  await mkdir(context.dataDir, { recursive: true });
}

export async function saveConfig(context: ConfigContext, next: CliConfig): Promise<void> {
  await ensureConfigDir(context);
  const normalized = configSchema.partial().parse(next);
  await writeFile(context.configPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}
