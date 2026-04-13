#!/usr/bin/env bun
import "dotenv/config";

type ExecResult = {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

function run(args: string[]): ExecResult {
  const proc = Bun.spawnSync({
    cmd: ["bun", "run", "src/index.ts", ...args],
    stdout: "pipe",
    stderr: "pipe",
    cwd: process.cwd(),
  });
  return {
    ok: proc.exitCode === 0,
    code: proc.exitCode,
    stdout: Buffer.from(proc.stdout).toString("utf8"),
    stderr: Buffer.from(proc.stderr).toString("utf8"),
  };
}

function requireOk(label: string, result: ExecResult): void {
  if (!result.ok) {
    console.error(`[FAIL] ${label}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  console.log(`[PASS] ${label}`);
}

function parseJsonResult<T>(result: ExecResult): T {
  const parsed = JSON.parse(result.stdout) as { ok: boolean; data: T };
  return parsed.data;
}

const ping = run(["ping", "--json"]);
requireOk("ping", ping);

const events = run(["events", "list", "--limit", "2", "--json"]);
requireOk("events list", events);

const markets = run(["markets", "list", "--limit", "5", "--json"]);
requireOk("markets list", markets);
const marketsData = parseJsonResult<{ markets?: Array<{ ticker?: string }> }>(markets);
const marketTickers = (marketsData.markets ?? [])
  .map((market) => market.ticker)
  .filter((ticker): ticker is string => typeof ticker === "string" && ticker.length > 0);
if (marketTickers.length === 0) {
  console.error("[FAIL] markets list returned no tickers to continue tests");
  process.exit(1);
}

let selectedTicker: string | undefined;
for (const ticker of marketTickers) {
  const marketGet = run(["markets", "get", ticker, "--json"]);
  if (marketGet.ok) {
    selectedTicker = ticker;
    break;
  }
}
if (!selectedTicker) {
  console.error("[FAIL] markets get failed for all candidate tickers from markets list");
  process.exit(1);
}
console.log("[PASS] markets get");

const orderbook = run(["markets", "orderbook", selectedTicker, "--depth", "5", "--json"]);
requireOk("markets orderbook", orderbook);

const trades = run(["markets", "trades", "--ticker", selectedTicker, "--limit", "5", "--json"]);
requireOk("markets trades", trades);

console.log("All public command smoke checks passed.");
