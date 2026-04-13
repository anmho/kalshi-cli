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

function requireEnv(name: string): void {
  if (!process.env[name] || process.env[name]?.trim().length === 0) {
    console.error(`[FAIL] Missing required environment variable: ${name}`);
    process.exit(2);
  }
}

function requireOk(label: string, result: ExecResult): void {
  if (!result.ok) {
    console.error(`[FAIL] ${label}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  console.log(`[PASS] ${label}`);
}

function requireFailure(label: string, result: ExecResult, expectedCode?: number): void {
  if (result.ok) {
    console.error(`[FAIL] ${label} unexpectedly succeeded`);
    process.exit(1);
  }
  if (expectedCode !== undefined && result.code !== expectedCode) {
    console.error(`[FAIL] ${label} returned ${result.code}; expected ${expectedCode}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  console.log(`[PASS] ${label} failed as expected`);
}

requireEnv("KALSHI_API_KEY_ID");
if (
  (!process.env.KALSHI_PRIVATE_KEY_PATH || process.env.KALSHI_PRIVATE_KEY_PATH.trim().length === 0) &&
  (!process.env.KALSHI_PRIVATE_KEY_PEM || process.env.KALSHI_PRIVATE_KEY_PEM.trim().length === 0)
) {
  console.error("[FAIL] Set either KALSHI_PRIVATE_KEY_PATH or KALSHI_PRIVATE_KEY_PEM");
  process.exit(2);
}

const accountLimits = run(["account", "limits", "--json"]);
requireOk("account limits", accountLimits);

const balance = run(["portfolio", "balance", "--json"]);
requireOk("portfolio balance", balance);

const positions = run(["portfolio", "positions", "--limit", "1", "--json"]);
requireOk("portfolio positions", positions);

const settlements = run(["portfolio", "settlements", "--limit", "1", "--json"]);
requireOk("portfolio settlements", settlements);

const restingOrderValue = run(["portfolio", "resting-order-value", "--json"]);
requireOk("portfolio resting-order-value", restingOrderValue);

const orders = run(["orders", "list", "--limit", "1", "--json"]);
requireOk("orders list", orders);

const queuePositions = run(["orders", "queue-positions", "--json"]);
requireOk("orders queue-positions", queuePositions);

const invalidWrite = run([
  "orders",
  "create",
  "--ticker",
  "DUMMY-TICKER",
  "--side",
  "yes",
  "--action",
  "buy",
  "--count",
  "1",
  "--json",
]);
requireFailure("orders create validation", invalidWrite, 2);

console.log("All private command smoke checks passed.");
