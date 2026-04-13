import type { Command } from "commander";
import { addGlobalOptions, withKalshiDeps } from "~/lib/cli-helpers.js";
import { maybePrint, printKeyValue } from "~/lib/output.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerAccountCommands(program: Command): void {
  const account = program.command("account").description("Account resource operations");

  addGlobalOptions(
    account.command("limits").description("Get account API limits (GET /account/api-limits)"),
  ).action(
    withKalshiDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
      const data = await client.call("GET /account/api-limits", () => client.account.getAccountApiLimits());
      maybePrint(data, options, () => printKeyValue(data));
    }),
  );
}
