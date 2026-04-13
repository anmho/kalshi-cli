import type { Command } from "commander";
import { loadConfig, saveConfig } from "~/lib/config.js";
import { CliError } from "~/lib/errors.js";
import { maybePrint, printJson, printKeyValue } from "~/lib/output.js";
import type { OutputOptions } from "~/lib/types.js";

type ConfigKey = "apiKeyId" | "privateKeyPath" | "privateKeyPem" | "baseUrl" | "timeoutMs";

const configKeys: ConfigKey[] = ["apiKeyId", "privateKeyPath", "privateKeyPem", "baseUrl", "timeoutMs"];

function assertConfigKey(value: string): asserts value is ConfigKey {
  if (!configKeys.includes(value as ConfigKey)) {
    throw new CliError(`Unsupported key "${value}". Allowed keys: ${configKeys.join(", ")}`, "validation");
  }
}

function redactConfig(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ...config,
    apiKeyId: typeof config.apiKeyId === "string" ? `${config.apiKeyId.slice(0, 6)}...` : config.apiKeyId,
    privateKeyPem: typeof config.privateKeyPem === "string" ? "<redacted>" : undefined,
  };
}

export function registerConfigCommands(program: Command): void {
  const command = program.command("config").description("Manage kalshi-cli local configuration");

  command.command("path").description("Show effective config file path").action(async () => {
    const context = await loadConfig({});
    console.log(context.configPath);
  });

  command
    .command("show")
    .description("Show merged config (file + env)")
    .option("--json", "Output as JSON")
    .action(async (options: OutputOptions) => {
      const context = await loadConfig({});
      const data = redactConfig(context.config as Record<string, unknown>);
      maybePrint(data, options, () => printKeyValue(data));
    });

  command.command("get").description("Get one config value").argument("<key>").action(async (key: string) => {
    assertConfigKey(key);
    const context = await loadConfig({});
    const value = context.config[key];
    if (value === undefined || value === null) {
      throw new CliError(`Config key "${key}" is not set.`, "validation");
    }
    if (key === "privateKeyPem") {
      console.log("<redacted>");
      return;
    }
    if (typeof value === "object") {
      printJson(value);
      return;
    }
    console.log(String(value));
  });

  command
    .command("set")
    .description("Set one config value")
    .argument("<key>")
    .argument("<value>")
    .action(async (key: string, value: string) => {
      assertConfigKey(key);
      const context = await loadConfig({});
      const next = { ...context.config };
      if (key === "timeoutMs") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          throw new CliError("timeoutMs must be a positive integer.", "validation");
        }
        next.timeoutMs = parsed;
      } else {
        next[key] = value;
      }
      await saveConfig(context, next);
      console.log(`Set ${key}.`);
    });

  command.command("unset").description("Unset one config value").argument("<key>").action(async (key: string) => {
    assertConfigKey(key);
    const context = await loadConfig({});
    const next = { ...context.config };
    delete next[key];
    await saveConfig(context, next);
    console.log(`Unset ${key}.`);
  });
}
