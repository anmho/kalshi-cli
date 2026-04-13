import type { Command } from "commander";
import type {
  AmendOrderRequest,
  BatchCancelOrdersRequest,
  BatchCreateOrdersRequest,
  CreateOrderRequest,
  DecreaseOrderRequest,
} from "kalshi-typescript";
import { addGlobalOptions, addJsonInputOptions, parseInteger, readJsonInput, withCursorPaging, withKalshiDeps } from "~/lib/cli-helpers.js";
import {
  isWideOutput,
  maybePrint,
  printCursor,
  printKeyValue,
  printOrders,
  printQueuePositions,
  printSuccess,
} from "~/lib/output.js";
import { CliError } from "~/lib/errors.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

function validateCreateOptions(options: {
  yesPrice?: number;
  noPrice?: number;
  yesPriceDollars?: string;
  noPriceDollars?: string;
}): void {
  const hasPrice =
    options.yesPrice !== undefined ||
    options.noPrice !== undefined ||
    options.yesPriceDollars !== undefined ||
    options.noPriceDollars !== undefined;
  if (!hasPrice) {
    throw new CliError(
      "Order requires price input. Provide one of --yes-price, --no-price, --yes-price-dollars, or --no-price-dollars.",
      "validation",
    );
  }
}

export function registerOrderCommands(program: Command): void {
  const orders = program.command("orders").description("Order resource operations");

  addGlobalOptions(
    withCursorPaging(
      orders.command("list").description("List orders (GET /portfolio/orders)"),
    ),
  )
    .option("--ticker <ticker>", "Filter by market ticker")
    .option("--event <ticker>", "Filter by event ticker")
    .option("--status <status>", "Filter by status")
    .option("--subaccount <number>", "Filter by subaccount (0-32)", (value: string) => parseInteger(value, "subaccount"))
    .option("--min-ts <unix>", "Filter by min timestamp", (value: string) => parseInteger(value, "min-ts"))
    .option("--max-ts <unix>", "Filter by max timestamp", (value: string) => parseInteger(value, "max-ts"))
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            ticker?: string;
            event?: string;
            status?: string;
            limit: number;
            cursor?: string;
            subaccount?: number;
            minTs?: number;
            maxTs?: number;
          },
      ) => {
        const data = await client.call("GET /portfolio/orders", () =>
          client.orders.getOrders(
            options.ticker,
            options.event,
            options.minTs,
            options.maxTs,
            options.status,
            options.limit,
            options.cursor,
            options.subaccount,
          ),
        );
        maybePrint(data, options, () => {
          const list = Array.isArray((data as { orders?: unknown[] }).orders)
            ? (data as { orders: unknown[] }).orders
            : [];
          printOrders(list, isWideOutput(options));
          printCursor((data as { cursor?: string }).cursor);
        });
      }),
    );

  addGlobalOptions(
    orders.command("get").description("Get order by ID (GET /portfolio/orders/{order_id})"),
  )
    .argument("<orderId>", "Order ID")
    .action(
      withKalshiDeps(({ client }) => async (orderId: string, options: CommandOverrides & OutputOptions) => {
        const data = await client.call(`GET /portfolio/orders/${orderId}`, () => client.orders.getOrder(orderId));
        maybePrint(data, options, () => {
          const order = (data as { order?: unknown }).order;
          printOrders(order ? [order] : [], true);
        });
      }),
    );

  addGlobalOptions(
    addJsonInputOptions(
      orders.command("create").description("Create order (POST /portfolio/orders)"),
      "order body",
    ),
  )
    .option("--ticker <ticker>", "Market ticker")
    .option("--side <side>", "yes|no")
    .option("--action <action>", "buy|sell")
    .option("--count <number>", "Contract count", (value: string) => parseInteger(value, "count"))
    .option("--yes-price <cents>", "Yes price in cents", (value: string) => parseInteger(value, "yes-price"))
    .option("--no-price <cents>", "No price in cents", (value: string) => parseInteger(value, "no-price"))
    .option("--yes-price-dollars <dollars>", "Yes price as dollar string")
    .option("--no-price-dollars <dollars>", "No price as dollar string")
    .option("--time-in-force <type>", "fill_or_kill|good_till_canceled|immediate_or_cancel")
    .option("--post-only", "Post-only order")
    .option("--reduce-only", "Reduce-only order")
    .option("--client-order-id <id>", "Client order ID")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            file?: string;
            body?: string;
            ticker?: string;
            side?: "yes" | "no";
            action?: "buy" | "sell";
            count?: number;
            yesPrice?: number;
            noPrice?: number;
            yesPriceDollars?: string;
            noPriceDollars?: string;
            timeInForce?: "fill_or_kill" | "good_till_canceled" | "immediate_or_cancel";
            postOnly?: boolean;
            reduceOnly?: boolean;
            clientOrderId?: string;
            subaccount?: number;
          },
      ) => {
        let payload: CreateOrderRequest;
        if (options.file || options.body || !process.stdin.isTTY) {
          payload = await readJsonInput(options) as CreateOrderRequest;
        } else {
          if (!options.ticker || !options.side || !options.action || options.count === undefined) {
            throw new CliError("Provide --ticker, --side, --action, and --count (or use --file/--body).", "validation");
          }
          validateCreateOptions(options);
          payload = {
            ticker: options.ticker,
            side: options.side,
            action: options.action,
            count: options.count,
            yes_price: options.yesPrice,
            no_price: options.noPrice,
            yes_price_dollars: options.yesPriceDollars,
            no_price_dollars: options.noPriceDollars,
            time_in_force: options.timeInForce,
            post_only: options.postOnly,
            reduce_only: options.reduceOnly,
            client_order_id: options.clientOrderId,
            subaccount: options.subaccount,
          };
        }

        const data = await client.call("POST /portfolio/orders", () => client.orders.createOrder(payload));
        maybePrint(data, options, () => printSuccess(data, false));
      }),
    );

  addGlobalOptions(
    orders.command("cancel").description("Cancel order (DELETE /portfolio/orders/{order_id})"),
  )
    .argument("<orderId>", "Order ID")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .action(
      withKalshiDeps(({ client }) => async (
        orderId: string,
        options: CommandOverrides & OutputOptions & { subaccount?: number },
      ) => {
        const data = await client.call(`DELETE /portfolio/orders/${orderId}`, () =>
          client.orders.cancelOrder(orderId, options.subaccount),
        );
        maybePrint(data, options, () => printSuccess(data, false));
      }),
    );

  addGlobalOptions(
    addJsonInputOptions(
      orders.command("amend").description("Amend order (POST /portfolio/orders/{order_id}/amend)"),
      "amend body",
    ),
  )
    .argument("<orderId>", "Order ID")
    .option("--ticker <ticker>", "Market ticker")
    .option("--side <side>", "yes|no")
    .option("--action <action>", "buy|sell")
    .option("--count <number>", "Updated contract count", (value: string) => parseInteger(value, "count"))
    .option("--yes-price <cents>", "Updated yes price in cents", (value: string) => parseInteger(value, "yes-price"))
    .option("--no-price <cents>", "Updated no price in cents", (value: string) => parseInteger(value, "no-price"))
    .option("--yes-price-dollars <dollars>", "Updated yes price as dollar string")
    .option("--no-price-dollars <dollars>", "Updated no price as dollar string")
    .option("--client-order-id <id>", "Original client order id")
    .option("--updated-client-order-id <id>", "New client order id")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .action(
      withKalshiDeps(({ client }) => async (
        orderId: string,
        options: CommandOverrides &
          OutputOptions & {
            file?: string;
            body?: string;
            ticker?: string;
            side?: "yes" | "no";
            action?: "buy" | "sell";
            count?: number;
            yesPrice?: number;
            noPrice?: number;
            yesPriceDollars?: string;
            noPriceDollars?: string;
            clientOrderId?: string;
            updatedClientOrderId?: string;
            subaccount?: number;
          },
      ) => {
        let payload: AmendOrderRequest;
        if (options.file || options.body || !process.stdin.isTTY) {
          payload = await readJsonInput(options) as AmendOrderRequest;
        } else {
          if (!options.ticker || !options.side || !options.action) {
            throw new CliError("Provide --ticker, --side, and --action (or use --file/--body).", "validation");
          }
          payload = {
            ticker: options.ticker,
            side: options.side,
            action: options.action,
            count: options.count,
            yes_price: options.yesPrice,
            no_price: options.noPrice,
            yes_price_dollars: options.yesPriceDollars,
            no_price_dollars: options.noPriceDollars,
            client_order_id: options.clientOrderId,
            updated_client_order_id: options.updatedClientOrderId,
            subaccount: options.subaccount,
          };
        }

        const data = await client.call(`POST /portfolio/orders/${orderId}/amend`, () =>
          client.orders.amendOrder(orderId, payload),
        );
        maybePrint(data, options, () => printSuccess(data, false));
      }),
    );

  addGlobalOptions(
    addJsonInputOptions(
      orders.command("decrease").description("Decrease order quantity (POST /portfolio/orders/{order_id}/decrease)"),
      "decrease body",
    ),
  )
    .argument("<orderId>", "Order ID")
    .option("--reduce-by <number>", "Reduce contracts by this amount", (value: string) => parseInteger(value, "reduce-by"))
    .option("--reduce-to <number>", "Reduce contracts to this amount", (value: string) => parseInteger(value, "reduce-to"))
    .option("--reduce-by-fp <value>", "Reduce-by fixed-point value")
    .option("--reduce-to-fp <value>", "Reduce-to fixed-point value")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .action(
      withKalshiDeps(({ client }) => async (
        orderId: string,
        options: CommandOverrides &
          OutputOptions & {
            file?: string;
            body?: string;
            reduceBy?: number;
            reduceTo?: number;
            reduceByFp?: string;
            reduceToFp?: string;
            subaccount?: number;
          },
      ) => {
        let payload: DecreaseOrderRequest;
        if (options.file || options.body || !process.stdin.isTTY) {
          payload = await readJsonInput(options) as DecreaseOrderRequest;
        } else {
          const hasReduceBy = options.reduceBy !== undefined || options.reduceByFp !== undefined;
          const hasReduceTo = options.reduceTo !== undefined || options.reduceToFp !== undefined;
          if (!hasReduceBy && !hasReduceTo) {
            throw new CliError("Provide reduce target via --reduce-by/--reduce-by-fp or --reduce-to/--reduce-to-fp.", "validation");
          }
          if (hasReduceBy && hasReduceTo) {
            throw new CliError("Use either reduce-by or reduce-to fields, not both.", "validation");
          }
          payload = {
            subaccount: options.subaccount,
            reduce_by: options.reduceBy,
            reduce_to: options.reduceTo,
            reduce_by_fp: options.reduceByFp,
            reduce_to_fp: options.reduceToFp,
          };
        }

        const data = await client.call(`POST /portfolio/orders/${orderId}/decrease`, () =>
          client.orders.decreaseOrder(orderId, payload),
        );
        maybePrint(data, options, () => printSuccess(data, false));
      }),
    );

  addGlobalOptions(
    orders.command("queue-position").description("Get queue position for order (GET /portfolio/orders/{order_id}/queue_position)"),
  )
    .argument("<orderId>", "Order ID")
    .action(
      withKalshiDeps(({ client }) => async (orderId: string, options: CommandOverrides & OutputOptions) => {
        const data = await client.call(`GET /portfolio/orders/${orderId}/queue_position`, () =>
          client.orders.getOrderQueuePosition(orderId),
        );
        maybePrint(data, options, () => printKeyValue({ order_id: orderId, ...(data as object) }));
      }),
    );

  addGlobalOptions(
    orders.command("queue-positions").description("List queue positions (GET /portfolio/orders/queue_positions)"),
  )
    .option("--market-tickers <csv>", "Filter by market tickers")
    .option("--event <ticker>", "Filter by event ticker")
    .option("--subaccount <number>", "Subaccount number", (value: string) => parseInteger(value, "subaccount"))
    .action(
      withKalshiDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            marketTickers?: string;
            event?: string;
            subaccount?: number;
          },
      ) => {
        const data = await client.call("GET /portfolio/orders/queue_positions", () =>
          client.orders.getOrderQueuePositions(options.marketTickers, options.event, options.subaccount),
        );
        maybePrint(data, options, () => {
          const list = Array.isArray((data as { queue_positions?: unknown[] }).queue_positions)
            ? (data as { queue_positions: unknown[] }).queue_positions
            : [];
          printQueuePositions(list, isWideOutput(options));
        });
      }),
    );

  addGlobalOptions(
    addJsonInputOptions(
      orders.command("batch-create").description("Create orders in batch (POST /portfolio/orders/batched)"),
      "batch create body",
    ),
  ).action(
    withKalshiDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { file?: string; body?: string }) => {
      const payload = await readJsonInput(options) as BatchCreateOrdersRequest;
      const data = await client.call("POST /portfolio/orders/batched", () => client.orders.batchCreateOrders(payload));
      maybePrint(data, options, () => printSuccess(data, false));
    }),
  );

  addGlobalOptions(
    addJsonInputOptions(
      orders.command("batch-cancel").description("Cancel orders in batch (DELETE /portfolio/orders/batched)"),
      "batch cancel body",
    ),
  ).action(
    withKalshiDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { file?: string; body?: string }) => {
      const payload = await readJsonInput(options) as BatchCancelOrdersRequest;
      const data = await client.call("DELETE /portfolio/orders/batched", () => client.orders.batchCancelOrders(payload));
      maybePrint(data, options, () => printSuccess(data, false));
    }),
  );
}
