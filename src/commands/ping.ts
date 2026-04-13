import type { Command } from "commander";
import { addGlobalOptions, withKalshiDeps } from "~/lib/cli-helpers.js";
import { maybePrint, printKeyValue } from "~/lib/output.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerPingCommands(program: Command): void {
  addGlobalOptions(
    program.command("ping").description("Ping Kalshi exchange status (GET /exchange/status)"),
  ).action(
    withKalshiDeps(
      ({ client }) => async (options: CommandOverrides & OutputOptions) => {
        const status = await client.call("GET /exchange/status", () => client.exchange.getExchangeStatus());
        maybePrint(status, options, () => printKeyValue(status));
      },
      { authRequired: false },
    ),
  );
}
