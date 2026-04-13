import columnify from "columnify";
import type { CliError } from "~/lib/errors.js";
import type { OutputOptions } from "~/lib/types.js";

type Row = Record<string, string>;
type ColumnSpec<T> = {
  name: string;
  value: (item: T) => unknown;
  maxWidth?: number;
};

const DEFAULT_COLUMN_WIDTH = 42;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function getPath(value: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = value;

  for (const part of parts) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number.parseInt(part, 10);
      if (Number.isNaN(index)) return undefined;
      current = current[index];
      continue;
    }

    const record = asRecord(current);
    if (!record) return undefined;
    current = record[part];
  }

  return current;
}

function firstPath(value: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const found = getPath(value, path);
    if (found !== undefined && found !== null && String(found).trim() !== "") {
      return found;
    }
  }
  return undefined;
}

function truncateText(value: string, maxWidth: number): string {
  if (maxWidth <= 0 || value.length <= maxWidth) return value;
  if (maxWidth <= 3) return value.slice(0, maxWidth);
  return `${value.slice(0, maxWidth - 3)}...`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toDisplay(value: unknown, maxWidth = DEFAULT_COLUMN_WIDTH): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return truncateText(
      normalizeText(
        value
          .map((item) => {
            if (typeof item === "string") return item;
            if (typeof item === "number" || typeof item === "boolean") return String(item);
            return JSON.stringify(item);
          })
          .join(", "),
      ),
      maxWidth,
    );
  }
  if (typeof value === "object") {
    return truncateText(normalizeText(JSON.stringify(value)), maxWidth);
  }
  return truncateText(normalizeText(String(value)), maxWidth);
}

function printRows(rows: Row[], columns: string[]): void {
  if (rows.length === 0) {
    console.log("(no results)");
    return;
  }
  console.log(
    columnify(rows, {
      columns,
      showHeaders: true,
      preserveNewLines: false,
      headingTransform: (heading: string) => heading.toUpperCase(),
      truncate: false,
      config: Object.fromEntries(columns.map((column) => [column, { minWidth: column.length }])),
    }),
  );
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printSuccess(data: unknown, json = false): void {
  if (json) {
    printJson({ ok: true, data });
    return;
  }
  if (typeof data === "string") {
    console.log(data);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

export function maybePrint(data: unknown, output: OutputOptions, human: () => void): void {
  if (output.json || output.output === "json") {
    printJson({ ok: true, data });
    return;
  }
  human();
}

export function isWideOutput(output: OutputOptions): boolean {
  if (output.json || output.output === "json") return false;
  return output.output === "wide";
}

export function printError(error: CliError, json = false): void {
  if (json) {
    printJson({
      ok: false,
      error: {
        kind: error.kind,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }
  console.error(error.message);
}

export function printTableRows<T>(items: T[], columns: ColumnSpec<T>[]): void {
  const rows: Row[] = items.map((item) => {
    const row: Row = {};
    for (const column of columns) {
      row[column.name] = toDisplay(column.value(item), column.maxWidth ?? DEFAULT_COLUMN_WIDTH);
    }
    return row;
  });
  printRows(rows, columns.map((column) => column.name));
}

export function printKeyValue(data: object): void {
  const rows = Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: toDisplay(value, 100),
  }));
  printRows(rows, ["key", "value"]);
}

export function printCursor(cursor: unknown): void {
  if (typeof cursor === "string" && cursor.length > 0) {
    console.log(`next_cursor: ${cursor}`);
  }
}

export function printMarkets(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "ticker", value: (item) => firstPath(item, ["ticker"]), maxWidth: 24 },
    { name: "event", value: (item) => firstPath(item, ["event_ticker"]), maxWidth: 20 },
    { name: "status", value: (item) => firstPath(item, ["status"]), maxWidth: 10 },
    { name: "last", value: (item) => firstPath(item, ["last_price_dollars"]), maxWidth: 10 },
    { name: "yes_bid", value: (item) => firstPath(item, ["yes_bid_dollars"]), maxWidth: 10 },
    { name: "yes_ask", value: (item) => firstPath(item, ["yes_ask_dollars"]), maxWidth: 10 },
    { name: "volume", value: (item) => firstPath(item, ["volume_fp"]), maxWidth: 12 },
  ];
  if (wide) {
    columns.push(
      { name: "open_interest", value: (item) => firstPath(item, ["open_interest_fp"]), maxWidth: 12 },
      { name: "close_time", value: (item) => firstPath(item, ["close_time"]), maxWidth: 24 },
      { name: "title", value: (item) => firstPath(item, ["title", "yes_sub_title"]), maxWidth: 36 },
    );
  }
  printTableRows(items, columns);
}

export function printEvents(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "event", value: (item) => firstPath(item, ["event_ticker"]), maxWidth: 24 },
    { name: "series", value: (item) => firstPath(item, ["series_ticker"]), maxWidth: 16 },
    { name: "title", value: (item) => firstPath(item, ["title"]), maxWidth: 40 },
  ];
  if (wide) {
    columns.push(
      { name: "subtitle", value: (item) => firstPath(item, ["sub_title"]), maxWidth: 40 },
      { name: "mutually_exclusive", value: (item) => firstPath(item, ["mutually_exclusive"]), maxWidth: 8 },
      { name: "updated", value: (item) => firstPath(item, ["last_updated_ts"]), maxWidth: 24 },
    );
  }
  printTableRows(items, columns);
}

export function printOrders(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "order_id", value: (item) => firstPath(item, ["order_id"]), maxWidth: 18 },
    { name: "ticker", value: (item) => firstPath(item, ["ticker"]), maxWidth: 24 },
    { name: "side", value: (item) => firstPath(item, ["side"]), maxWidth: 6 },
    { name: "action", value: (item) => firstPath(item, ["action"]), maxWidth: 6 },
    { name: "status", value: (item) => firstPath(item, ["status"]), maxWidth: 12 },
    { name: "yes_price", value: (item) => firstPath(item, ["yes_price_dollars"]), maxWidth: 10 },
    { name: "remaining", value: (item) => firstPath(item, ["remaining_count_fp"]), maxWidth: 10 },
  ];
  if (wide) {
    columns.push(
      { name: "filled", value: (item) => firstPath(item, ["fill_count_fp"]), maxWidth: 10 },
      { name: "created_time", value: (item) => firstPath(item, ["created_time"]), maxWidth: 24 },
      { name: "client_order_id", value: (item) => firstPath(item, ["client_order_id"]), maxWidth: 20 },
    );
  }
  printTableRows(items, columns);
}

export function printPositions(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "ticker", value: (item) => firstPath(item, ["ticker"]), maxWidth: 24 },
    { name: "position", value: (item) => firstPath(item, ["position_fp"]), maxWidth: 12 },
    { name: "total_traded", value: (item) => firstPath(item, ["total_traded_dollars"]), maxWidth: 14 },
    { name: "exposure", value: (item) => firstPath(item, ["market_exposure_dollars"]), maxWidth: 14 },
    { name: "pnl", value: (item) => firstPath(item, ["realized_pnl_dollars"]), maxWidth: 14 },
  ];
  if (wide) {
    columns.push(
      { name: "fees_paid", value: (item) => firstPath(item, ["fees_paid_dollars"]), maxWidth: 12 },
      { name: "updated", value: (item) => firstPath(item, ["last_updated_ts"]), maxWidth: 24 },
    );
  }
  printTableRows(items, columns);
}

export function printFills(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "trade_id", value: (item) => firstPath(item, ["trade_id", "id"]), maxWidth: 16 },
    { name: "order_id", value: (item) => firstPath(item, ["order_id"]), maxWidth: 16 },
    { name: "ticker", value: (item) => firstPath(item, ["ticker"]), maxWidth: 24 },
    { name: "side", value: (item) => firstPath(item, ["side"]), maxWidth: 6 },
    { name: "count", value: (item) => firstPath(item, ["count_fp", "count"]), maxWidth: 10 },
    { name: "yes_price", value: (item) => firstPath(item, ["yes_price_dollars"]), maxWidth: 10 },
  ];
  if (wide) {
    columns.push(
      { name: "created_time", value: (item) => firstPath(item, ["created_time", "created_ts"]), maxWidth: 24 },
      { name: "cost", value: (item) => firstPath(item, ["cost_dollars", "taker_fill_cost_dollars"]), maxWidth: 12 },
    );
  }
  printTableRows(items, columns);
}

export function printAnnouncements(items: unknown[]): void {
  printTableRows(items, [
    { name: "id", value: (item) => firstPath(item, ["id"]), maxWidth: 10 },
    { name: "title", value: (item) => firstPath(item, ["title"]), maxWidth: 50 },
    { name: "published", value: (item) => firstPath(item, ["published_time", "created_time"]), maxWidth: 24 },
  ]);
}

export function printTrades(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "ticker", value: (item) => firstPath(item, ["ticker"]), maxWidth: 24 },
    { name: "yes_price", value: (item) => firstPath(item, ["yes_price_dollars", "yes_price"]), maxWidth: 10 },
    { name: "count", value: (item) => firstPath(item, ["count_fp", "count"]), maxWidth: 10 },
    { name: "time", value: (item) => firstPath(item, ["created_time", "created_ts"]), maxWidth: 24 },
  ];
  if (wide) {
    columns.push({ name: "trade_id", value: (item) => firstPath(item, ["trade_id", "id"]), maxWidth: 16 });
  }
  printTableRows(items, columns);
}

export function printQueuePositions(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "order_id", value: (item) => firstPath(item, ["order_id"]), maxWidth: 18 },
    { name: "market", value: (item) => firstPath(item, ["market_ticker"]), maxWidth: 26 },
    { name: "queue_position", value: (item) => firstPath(item, ["queue_position_fp"]), maxWidth: 14 },
  ];
  if (wide) {
    columns.push({ name: "raw", value: (item) => item, maxWidth: 60 });
  }
  printTableRows(items, columns);
}

export function printSettlements(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "ticker", value: (item) => firstPath(item, ["ticker"]), maxWidth: 24 },
    { name: "event", value: (item) => firstPath(item, ["event_ticker"]), maxWidth: 20 },
    { name: "result", value: (item) => firstPath(item, ["market_result"]), maxWidth: 8 },
    { name: "revenue", value: (item) => firstPath(item, ["revenue"]), maxWidth: 10 },
    { name: "settled", value: (item) => firstPath(item, ["settled_time"]), maxWidth: 24 },
  ];
  if (wide) {
    columns.push(
      { name: "yes_count", value: (item) => firstPath(item, ["yes_count_fp"]), maxWidth: 10 },
      { name: "no_count", value: (item) => firstPath(item, ["no_count_fp"]), maxWidth: 10 },
      { name: "fee_cost", value: (item) => firstPath(item, ["fee_cost"]), maxWidth: 10 },
    );
  }
  printTableRows(items, columns);
}

export function printSubaccountBalances(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "subaccount", value: (item) => firstPath(item, ["subaccount_number"]), maxWidth: 10 },
    { name: "balance", value: (item) => firstPath(item, ["balance"]), maxWidth: 14 },
    { name: "updated_ts", value: (item) => firstPath(item, ["updated_ts"]), maxWidth: 14 },
  ];
  if (wide) {
    columns.push({ name: "raw", value: (item) => item, maxWidth: 60 });
  }
  printTableRows(items, columns);
}

export function printSubaccountTransfers(items: unknown[], wide = false): void {
  const columns: ColumnSpec<unknown>[] = [
    { name: "transfer_id", value: (item) => firstPath(item, ["transfer_id"]), maxWidth: 18 },
    { name: "from", value: (item) => firstPath(item, ["from_subaccount"]), maxWidth: 6 },
    { name: "to", value: (item) => firstPath(item, ["to_subaccount"]), maxWidth: 6 },
    { name: "amount_cents", value: (item) => firstPath(item, ["amount_cents"]), maxWidth: 12 },
    { name: "created_ts", value: (item) => firstPath(item, ["created_ts"]), maxWidth: 14 },
  ];
  if (wide) {
    columns.push({ name: "raw", value: (item) => item, maxWidth: 60 });
  }
  printTableRows(items, columns);
}

export function printSubaccountNetting(items: unknown[]): void {
  printTableRows(items, [
    { name: "subaccount", value: (item) => firstPath(item, ["subaccount_number"]), maxWidth: 10 },
    { name: "enabled", value: (item) => firstPath(item, ["enabled"]), maxWidth: 8 },
  ]);
}
