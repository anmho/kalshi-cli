import type { Command } from "commander";
import { addGlobalOptions, withKalshiDeps } from "~/lib/cli-helpers.js";
import { maybePrint, printAnnouncements, printKeyValue } from "~/lib/output.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerExchangeCommands(program: Command): void {
  const exchange = program.command("exchange").description("Exchange resource operations");

  addGlobalOptions(
    exchange.command("status").description("Get exchange status (GET /exchange/status)"),
  ).action(
    withKalshiDeps(
      ({ client }) => async (options: CommandOverrides & OutputOptions) => {
        const data = await client.call("GET /exchange/status", () => client.exchange.getExchangeStatus());
        maybePrint(data, options, () => printKeyValue(data));
      },
      { authRequired: false },
    ),
  );

  addGlobalOptions(
    exchange.command("schedule").description("Get exchange schedule (GET /exchange/schedule)"),
  ).action(
    withKalshiDeps(
      ({ client }) => async (options: CommandOverrides & OutputOptions) => {
        const data = await client.call("GET /exchange/schedule", () => client.exchange.getExchangeSchedule());
        maybePrint(data, options, () => printKeyValue(data));
      },
      { authRequired: false },
    ),
  );

  addGlobalOptions(
    exchange.command("announcements").description("List exchange announcements (GET /exchange/announcements)"),
  ).action(
    withKalshiDeps(
      ({ client }) => async (options: CommandOverrides & OutputOptions) => {
        const data = await client.call("GET /exchange/announcements", () => client.exchange.getExchangeAnnouncements());
        const announcements = Array.isArray((data as { announcements?: unknown[] }).announcements)
          ? (data as { announcements: unknown[] }).announcements
          : [];
        maybePrint(data, options, () => printAnnouncements(announcements));
      },
      { authRequired: false },
    ),
  );
}
