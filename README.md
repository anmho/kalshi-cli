# kalshi-cli

Terminal-first Kalshi CLI built on the official TypeScript SDK (`kalshi-typescript`).

Official references:

- Kalshi docs: <https://docs.kalshi.com/>
- TypeScript SDK quickstart: <https://docs.kalshi.com/sdks/typescript/quickstart>
- API keys/auth: <https://docs.kalshi.com/getting_started/api_keys>
- Hosted CLI docs (Docusaurus): <https://anmho.github.io/kalshi-cli/>

## Install

```bash
bun install
bun run build
```

Local binary:

```bash
./dist/index.js --help
```

Install globally on your machine:

```bash
bun run install:system
kalshi --help
```

## Authentication

Kalshi API auth uses API Key ID + RSA private key signing (no OAuth in current official docs).

Local `.env` (recommended for development):

```bash
cp .env.example .env
```

Environment variables:

```bash
export KALSHI_API_KEY_ID="your-key-id"
export KALSHI_PRIVATE_KEY_PATH="$HOME/.kalshi/kalshi-key.pem"
export KALSHI_BASE_URL="https://api.elections.kalshi.com/trade-api/v2"
export KALSHI_TIMEOUT_MS="10000"
```

Or persist in CLI config:

```bash
kalshi config set apiKeyId your-key-id
kalshi config set privateKeyPath "$HOME/.kalshi/kalshi-key.pem"
kalshi config set baseUrl https://api.elections.kalshi.com/trade-api/v2
kalshi config show
```

Precedence: `CLI flags > environment (.env) > config file > defaults`.

## Quickstart

Public endpoints (no credentials required):

```bash
kalshi ping
kalshi exchange status
kalshi events list --limit 10
kalshi markets list --limit 10
```

Private endpoints (credentials required):

```bash
kalshi portfolio balance
kalshi orders list --limit 20
kalshi account limits
kalshi portfolio settlements --limit 20
kalshi orders queue-positions
```

## Output Modes

- Default table: human-readable columns
- Wide table: `-o wide`
- JSON: `--json` or `-o json`

Examples:

```bash
kalshi markets list --limit 5
kalshi markets list --limit 5 -o wide
kalshi markets list --limit 5 --json
```

Typical default table:

```text
TICKER                   EVENT                STATUS LAST   YES_BID YES_ASK VOLUME
KX...                    KX...                active 0.0000 0.0000  0.0000  0.00
```

Typical wide table:

```text
TICKER ... OPEN_INTEREST CLOSE_TIME           TITLE
KX...      0.00          2026-04-16T14:00:00Z yes ...
```

JSON output:

```bash
kalshi markets list --limit 2 --json
```

## Commands

- `config`: local config management
- `doctor`: local config + connectivity checks
- `ping`: exchange reachability
- `exchange`: status, schedule, announcements
- `events`: list/get
- `markets`: list/get/orderbook/trades
- `orders`: list/get/create/cancel/amend/decrease/queue-position/queue-positions/batch-create/batch-cancel
- `portfolio`: balance/positions/fills/settlements/resting-order-value/subaccounts
- `account`: API limits

Each subcommand description includes the mapped endpoint (for example `GET /markets`).

## Docs

Docusaurus docs + API reference are in `website/`.

```bash
bun run docs:sync-openapi
bun run docs:dev
```

Build docs:

```bash
bun run docs:build
```

Deploy docs:

- GitHub Actions workflow: `.github/workflows/docs-pages.yml`
- Published URL: <https://anmho.github.io/kalshi-cli/>

## Validation

```bash
bun run check
bun run build
bun run test:commands
bun run test:commands:private
```
