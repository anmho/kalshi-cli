import type { Command } from "commander";
import { addGlobalOptions, parseInteger, withCursorPaging, withKalshiDeps } from "~/lib/cli-helpers.js";
import { isWideOutput, maybePrint, printCursor, printMarkets, printSuccess, printTrades } from "~/lib/output.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerMarketCommands(program: Command): void {
  const markets = program.command("markets").description("Market resource operations");

  addGlobalOptions(
    withCursorPaging(
      markets.command("list").description("List markets (GET /markets)"),
    ),
  )
    .option("--event <ticker>", "Filter by event ticker")
    .option("--series <ticker>", "Filter by series ticker")
    .option("--status <status>", "Filter by status (unopened|open|closed|settled)")
    .option("--tickers <csv>", "Comma-separated market tickers")
    .option("--min-close-ts <unix>", "Minimum close timestamp", (value: string) => parseInteger(value, "min-close-ts"))
    .option("--min-updated-ts <unix>", "Minimum metadata update timestamp", (value: string) => parseInteger(value, "min-updated-ts"))
    .action(
      withKalshiDeps(
        ({ client }) => async (
          options: CommandOverrides &
            OutputOptions & {
              limit: number;
              cursor?: string;
              event?: string;
              series?: string;
              status?: string;
              tickers?: string;
              minCloseTs?: number;
              minUpdatedTs?: number;
            },
        ) => {
          const data = await client.call("GET /markets", () =>
            client.markets.getMarkets(
              options.limit,
              options.cursor,
              options.event,
              options.series,
              undefined,
              undefined,
              options.minUpdatedTs,
              undefined,
              options.minCloseTs,
              undefined,
              undefined,
              options.status as never,
              options.tickers,
              undefined,
            ),
          );
          maybePrint(data, options, () => {
            const list = Array.isArray((data as { markets?: unknown[] }).markets)
              ? (data as { markets: unknown[] }).markets
              : [];
            printMarkets(list, isWideOutput(options));
            printCursor((data as { cursor?: string }).cursor);
          });
        },
        { authRequired: false },
      ),
    );

  addGlobalOptions(
    markets.command("get").description("Get market by ticker (GET /markets/{ticker})"),
  )
    .argument("<ticker>", "Market ticker")
    .action(
      withKalshiDeps(
        ({ client }) => async (ticker: string, options: CommandOverrides & OutputOptions) => {
          const data = await client.call(`GET /markets/${ticker}`, () => client.markets.getMarket(ticker));
          maybePrint(data, options, () => {
            const market = (data as { market?: unknown }).market;
            printMarkets(market ? [market] : [], true);
          });
        },
        { authRequired: false },
      ),
    );

  addGlobalOptions(
    markets.command("orderbook").description("Get market orderbook (GET /markets/{ticker}/orderbook)"),
  )
    .argument("<ticker>", "Market ticker")
    .option("--depth <n>", "Orderbook depth (1-100)", (value: string) => parseInteger(value, "depth"))
    .action(
      withKalshiDeps(
        ({ client }) => async (
          ticker: string,
          options: CommandOverrides &
            OutputOptions & {
              depth?: number;
            },
        ) => {
          const data = await client.call(`GET /markets/${ticker}/orderbook`, () =>
            client.markets.getMarketOrderbook(ticker, options.depth),
          );
          maybePrint(data, options, () => printSuccess(data, false));
        },
        { authRequired: false },
      ),
    );

  addGlobalOptions(
    withCursorPaging(
      markets.command("trades").description("List market trades (GET /markets/trades)"),
    ),
  )
    .option("--ticker <ticker>", "Filter by market ticker")
    .option("--min-ts <unix>", "Minimum trade timestamp", (value: string) => parseInteger(value, "min-ts"))
    .option("--max-ts <unix>", "Maximum trade timestamp", (value: string) => parseInteger(value, "max-ts"))
    .action(
      withKalshiDeps(
        ({ client }) => async (
          options: CommandOverrides &
            OutputOptions & {
              limit: number;
              cursor?: string;
              ticker?: string;
              minTs?: number;
              maxTs?: number;
            },
        ) => {
          const data = await client.call("GET /markets/trades", () =>
            client.markets.getTrades(options.limit, options.cursor, options.ticker, options.minTs, options.maxTs),
          );
          maybePrint(data, options, () => {
            const trades = Array.isArray((data as { trades?: unknown[] }).trades)
              ? (data as { trades: unknown[] }).trades
              : [];
            printTrades(trades, isWideOutput(options));
            printCursor((data as { cursor?: string }).cursor);
          });
        },
        { authRequired: false },
      ),
    );
}
