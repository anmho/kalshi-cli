import type { Command } from "commander";
import { addGlobalOptions } from "~/lib/cli-helpers.js";
import { loadConfig } from "~/lib/config.js";
import { KalshiClient } from "~/lib/kalshi/client.js";
import { printJson, printKeyValue, printTableRows } from "~/lib/output.js";
import type { CommandOverrides } from "~/lib/types.js";

type Check = {
  status: "pass" | "warn" | "fail";
  check: string;
  detail: string;
};

export function registerDoctorCommands(program: Command): void {
  addGlobalOptions(program.command("doctor").description("Validate configuration and API reachability")).action(
    async (_options, command) => {
      const opts = command.optsWithGlobals() as CommandOverrides;
      const context = await loadConfig(opts);
      const json = opts.json === true || opts.output === "json";
      const wide = !json && opts.output === "wide";
    const checks: Check[] = [];

    checks.push({
      status: context.config.baseUrl ? "pass" : "fail",
      check: "base_url",
      detail: context.config.baseUrl ?? "Not configured",
    });
    checks.push({
      status: context.config.apiKeyId ? "pass" : "warn",
      check: "api_key_id",
      detail: context.config.apiKeyId ? "Configured" : "Not configured (required for private endpoints)",
    });
    checks.push({
      status: context.config.privateKeyPath || context.config.privateKeyPem ? "pass" : "warn",
      check: "private_key",
      detail:
        context.config.privateKeyPath
          ? `Path: ${context.config.privateKeyPath}`
          : context.config.privateKeyPem
            ? "Inline PEM configured"
            : "Not configured (required for private endpoints)",
    });
    checks.push({
      status: context.config.timeoutMs ? "pass" : "warn",
      check: "timeout_ms",
      detail: String(context.config.timeoutMs ?? "Not configured"),
    });

      const client = new KalshiClient({
        baseUrl: context.config.baseUrl,
        timeoutMs: context.config.timeoutMs,
        apiKeyId: context.config.apiKeyId,
        privateKeyPath: context.config.privateKeyPath,
        privateKeyPem: context.config.privateKeyPem,
        verbose: opts.verbose ?? process.env.KALSHI_VERBOSE === "1",
      });

      try {
        const status = await client.call("GET /exchange/status", () => client.exchange.getExchangeStatus());
        checks.push({
          status: "pass",
          check: "public_api",
          detail: `Reachable (${Object.keys(status as object).join(", ")})`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed";
        checks.push({
          status: "fail",
          check: "public_api",
          detail: message,
        });
      }

      const summary = {
        config_path: context.configPath,
        has_auth_credentials: client.hasAuth(),
      };

      if (json) {
        printJson({ ok: true, data: { checks, summary } });
        return;
      }

      printTableRows(checks, [
        { name: "status", value: (check) => check.status.toUpperCase(), maxWidth: 6 },
        { name: "check", value: (check) => check.check, maxWidth: 16 },
        { name: "detail", value: (check) => check.detail, maxWidth: wide ? 140 : 80 },
      ]);

      console.log("");
      printKeyValue(summary);
    },
  );
}
