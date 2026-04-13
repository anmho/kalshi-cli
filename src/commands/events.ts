import type { Command } from "commander";
import { addGlobalOptions, parseInteger, withCursorPaging, withKalshiDeps } from "~/lib/cli-helpers.js";
import { isWideOutput, maybePrint, printCursor, printEvents, printSuccess } from "~/lib/output.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerEventCommands(program: Command): void {
  const events = program.command("events").description("Event resource operations");

  addGlobalOptions(
    withCursorPaging(
      events.command("list").description("List events (GET /events)"),
    ),
  )
    .option("--status <status>", "Filter by status (unopened|open|closed|settled)")
    .option("--series <ticker>", "Filter by series ticker")
    .option("--min-close-ts <unix>", "Filter by min close timestamp", (value: string) => parseInteger(value, "min-close-ts"))
    .option("--min-updated-ts <unix>", "Filter by min metadata update timestamp", (value: string) => parseInteger(value, "min-updated-ts"))
    .option("--with-markets", "Include nested markets in response")
    .action(
      withKalshiDeps(
        ({ client }) => async (
          options: CommandOverrides &
            OutputOptions & {
              limit: number;
              cursor?: string;
              status?: string;
              series?: string;
              minCloseTs?: number;
              minUpdatedTs?: number;
              withMarkets?: boolean;
            },
        ) => {
          const data = await client.call("GET /events", () =>
            client.events.getEvents(
              options.limit,
              options.cursor,
              Boolean(options.withMarkets),
              undefined,
              options.status as never,
              options.series,
              options.minCloseTs,
              options.minUpdatedTs,
            ),
          );
          maybePrint(data, options, () => {
            const list = Array.isArray((data as { events?: unknown[] }).events)
              ? (data as { events: unknown[] }).events
              : [];
            printEvents(list, isWideOutput(options));
            printCursor((data as { cursor?: string }).cursor);
          });
        },
        { authRequired: false },
      ),
    );

  addGlobalOptions(
    events.command("get").description("Get event by ticker (GET /events/{event_ticker})"),
  )
    .argument("<eventTicker>", "Event ticker")
    .option("--with-markets", "Include nested markets")
    .action(
      withKalshiDeps(
        ({ client }) => async (
          eventTicker: string,
          options: CommandOverrides & OutputOptions & { withMarkets?: boolean },
        ) => {
          const data = await client.call(`GET /events/${eventTicker}`, () =>
            client.events.getEvent(eventTicker, Boolean(options.withMarkets)),
          );
          maybePrint(data, options, () => {
            const event = (data as { event?: unknown }).event;
            printEvents(event ? [event] : [], true);
            if (options.withMarkets) {
              const markets = Array.isArray((data as { markets?: unknown[] }).markets)
                ? (data as { markets: unknown[] }).markets
                : [];
              if (markets.length > 0) {
                console.log("");
                console.log("related_markets:");
                printSuccess(markets, false);
              }
            }
          });
        },
        { authRequired: false },
      ),
    );
}
