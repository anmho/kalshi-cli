import type { Command } from "commander";
import type {
  ApplySubaccountTransferRequest,
  UpdateSubaccountNettingRequest,
} from "kalshi-typescript";
import {
  addGlobalOptions,
  addJsonInputOptions,
  parseInteger,
  readJsonInput,
  withCursorPaging,
  withKalshiDeps,
} from "~/lib/cli-helpers.js";
import {
  isWideOutput,
  maybePrint,
  printCursor,
  printFills,
  printKeyValue,
  printPositions,
  printSettlements,
  printSubaccountBalances,
  printSubaccountNetting,
  printSubaccountTransfers,
  printSuccess,
} from "~/lib/output.js";
import { CliError } from "~/lib/errors.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerPortfolioCommands(program: Command): void {
  const portfolio = program.command("portfolio").description("Portfolio resource operations");

  addGlobalOptions(
    portfolio.command("balance").description("Get account balance (GET /portfolio/balance)"),
  )
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides & OutputOptions & { subaccount?: number },
      ) => {
        const data = await client.call("GET /portfolio/balance", () => client.portfolio.getBalance(options.subaccount));
        maybePrint(data, options, () => printKeyValue(data));
      }),
    );

  addGlobalOptions(
    withCursorPaging(
      portfolio.command("positions").description("List positions (GET /portfolio/positions)"),
    ),
  )
    .option("--ticker <ticker>", "Filter by market ticker")
    .option("--event <ticker>", "Filter by event ticker")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .option("--count-filter <value>", "position|total_traded or comma-separated")
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            cursor?: string;
            limit: number;
            countFilter?: string;
            ticker?: string;
            event?: string;
            subaccount?: number;
          },
      ) => {
        const data = await client.call("GET /portfolio/positions", () =>
          client.portfolio.getPositions(
            options.cursor,
            options.limit,
            options.countFilter,
            options.ticker,
            options.event,
            options.subaccount,
          ),
        );
        maybePrint(data, options, () => {
          const positions = Array.isArray((data as { market_positions?: unknown[] }).market_positions)
            ? (data as { market_positions: unknown[] }).market_positions
            : [];
          printPositions(positions, isWideOutput(options));
          printCursor((data as { cursor?: string }).cursor);
        });
      }),
    );

  addGlobalOptions(
    withCursorPaging(
      portfolio.command("fills").description("List fills (GET /portfolio/fills)"),
    ),
  )
    .option("--ticker <ticker>", "Filter by market ticker")
    .option("--order-id <id>", "Filter by order ID")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .option("--min-ts <unix>", "Minimum fill timestamp", (value: string) => parseInteger(value, "min-ts"))
    .option("--max-ts <unix>", "Maximum fill timestamp", (value: string) => parseInteger(value, "max-ts"))
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            ticker?: string;
            orderId?: string;
            minTs?: number;
            maxTs?: number;
            limit: number;
            cursor?: string;
            subaccount?: number;
          },
      ) => {
        const data = await client.call("GET /portfolio/fills", () =>
          client.portfolio.getFills(
            options.ticker,
            options.orderId,
            options.minTs,
            options.maxTs,
            options.limit,
            options.cursor,
            options.subaccount,
          ),
        );
        maybePrint(data, options, () => {
          const fills = Array.isArray((data as { fills?: unknown[] }).fills)
            ? (data as { fills: unknown[] }).fills
            : [];
          printFills(fills, isWideOutput(options));
          printCursor((data as { cursor?: string }).cursor);
        });
      }),
    );

  addGlobalOptions(
    withCursorPaging(
      portfolio.command("settlements").description("List settlements (GET /portfolio/settlements)"),
    ),
  )
    .option("--ticker <ticker>", "Filter by market ticker")
    .option("--event <ticker>", "Filter by event ticker")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .option("--min-ts <unix>", "Minimum timestamp", (value: string) => parseInteger(value, "min-ts"))
    .option("--max-ts <unix>", "Maximum timestamp", (value: string) => parseInteger(value, "max-ts"))
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            limit: number;
            cursor?: string;
            ticker?: string;
            event?: string;
            minTs?: number;
            maxTs?: number;
            subaccount?: number;
          },
      ) => {
        const data = await client.call("GET /portfolio/settlements", () =>
          client.portfolio.getSettlements(
            options.limit,
            options.cursor,
            options.ticker,
            options.event,
            options.minTs,
            options.maxTs,
            options.subaccount,
          ),
        );
        maybePrint(data, options, () => {
          const settlements = Array.isArray((data as { settlements?: unknown[] }).settlements)
            ? (data as { settlements: unknown[] }).settlements
            : [];
          printSettlements(settlements, isWideOutput(options));
          printCursor((data as { cursor?: string }).cursor);
        });
      }),
    );

  addGlobalOptions(
    portfolio.command("resting-order-value").description("Get resting order total value (GET /portfolio/resting_order_total_value)"),
  ).action(
    withKalshiDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
      const data = await client.call("GET /portfolio/resting_order_total_value", () =>
        client.portfolio.getPortfolioRestingOrderTotalValue(),
      );
      maybePrint(data, options, () => printKeyValue(data));
    }),
  );

  const subaccounts = portfolio.command("subaccounts").description("Subaccount operations");

  addGlobalOptions(
    subaccounts.command("create").description("Create subaccount (POST /portfolio/subaccounts)"),
  ).action(
    withKalshiDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
      const data = await client.call("POST /portfolio/subaccounts", () => client.portfolio.createSubaccount());
      maybePrint(data, options, () => printSuccess(data, false));
    }),
  );

  addGlobalOptions(
    subaccounts.command("balances").description("List subaccount balances (GET /portfolio/subaccounts/balances)"),
  ).action(
    withKalshiDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
      const data = await client.call("GET /portfolio/subaccounts/balances", () => client.portfolio.getSubaccountBalances());
      maybePrint(data, options, () => {
        const balances = Array.isArray((data as { subaccount_balances?: unknown[] }).subaccount_balances)
          ? (data as { subaccount_balances: unknown[] }).subaccount_balances
          : [];
        printSubaccountBalances(balances, isWideOutput(options));
      });
    }),
  );

  const transfers = subaccounts.command("transfers").description("Subaccount transfer operations");

  addGlobalOptions(
    withCursorPaging(
      transfers.command("list").description("List subaccount transfers (GET /portfolio/subaccounts/transfers)"),
    ),
  ).action(
    withKalshiDeps(({ client }) => async (
      options: CommandOverrides & OutputOptions & { limit: number; cursor?: string },
    ) => {
      const data = await client.call("GET /portfolio/subaccounts/transfers", () =>
        client.portfolio.getSubaccountTransfers(options.limit, options.cursor),
      );
      maybePrint(data, options, () => {
        const list = Array.isArray((data as { transfers?: unknown[] }).transfers)
          ? (data as { transfers: unknown[] }).transfers
          : [];
        printSubaccountTransfers(list, isWideOutput(options));
        printCursor((data as { cursor?: string }).cursor);
      });
    }),
  );

  addGlobalOptions(
    addJsonInputOptions(
      transfers.command("create").description("Create transfer (POST /portfolio/subaccounts/transfers)"),
      "transfer body",
    ),
  )
    .option("--client-transfer-id <id>", "Client transfer id")
    .option("--from-subaccount <number>", "Source subaccount", (value: string) => parseInteger(value, "from-subaccount"))
    .option("--to-subaccount <number>", "Destination subaccount", (value: string) => parseInteger(value, "to-subaccount"))
    .option("--amount-cents <number>", "Transfer amount in cents", (value: string) => parseInteger(value, "amount-cents"))
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            file?: string;
            body?: string;
            clientTransferId?: string;
            fromSubaccount?: number;
            toSubaccount?: number;
            amountCents?: number;
          },
      ) => {
        let payload: ApplySubaccountTransferRequest;
        if (options.file || options.body || !process.stdin.isTTY) {
          payload = await readJsonInput(options) as ApplySubaccountTransferRequest;
        } else {
          if (
            !options.clientTransferId ||
            options.fromSubaccount === undefined ||
            options.toSubaccount === undefined ||
            options.amountCents === undefined
          ) {
            throw new CliError(
              "Provide --client-transfer-id, --from-subaccount, --to-subaccount, and --amount-cents (or use --file/--body).",
              "validation",
            );
          }
          payload = {
            client_transfer_id: options.clientTransferId,
            from_subaccount: options.fromSubaccount,
            to_subaccount: options.toSubaccount,
            amount_cents: options.amountCents,
          };
        }
        const data = await client.call("POST /portfolio/subaccounts/transfers", () =>
          client.portfolio.applySubaccountTransfer(payload),
        );
        maybePrint(data, options, () => printSuccess(data, false));
      }),
    );

  const netting = subaccounts.command("netting").description("Subaccount netting operations");

  addGlobalOptions(
    netting.command("get").description("Get subaccount netting config (GET /portfolio/subaccounts/netting)"),
  ).action(
    withKalshiDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
      const data = await client.call("GET /portfolio/subaccounts/netting", () => client.portfolio.getSubaccountNetting());
      maybePrint(data, options, () => {
        const list = Array.isArray((data as { netting_configs?: unknown[] }).netting_configs)
          ? (data as { netting_configs: unknown[] }).netting_configs
          : [];
        printSubaccountNetting(list);
      });
    }),
  );

  addGlobalOptions(
    addJsonInputOptions(
      netting.command("set").description("Set subaccount netting (POST /portfolio/subaccounts/netting)"),
      "netting body",
    ),
  )
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .option("--enabled", "Enable netting")
    .option("--disabled", "Disable netting")
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            file?: string;
            body?: string;
            subaccount?: number;
            enabled?: boolean;
            disabled?: boolean;
          },
      ) => {
        let payload: UpdateSubaccountNettingRequest;
        if (options.file || options.body || !process.stdin.isTTY) {
          payload = await readJsonInput(options) as UpdateSubaccountNettingRequest;
        } else {
          if (options.subaccount === undefined) {
            throw new CliError("Provide --subaccount (or use --file/--body).", "validation");
          }
          if (options.enabled === options.disabled) {
            throw new CliError("Use exactly one of --enabled or --disabled.", "validation");
          }
          payload = {
            subaccount_number: options.subaccount,
            enabled: Boolean(options.enabled && !options.disabled),
          };
        }
        const data = await client.call("POST /portfolio/subaccounts/netting", () =>
          client.portfolio.updateSubaccountNetting(payload),
        );
        maybePrint(data, options, () => printSuccess("Updated netting configuration.", false));
      }),
    );
}
