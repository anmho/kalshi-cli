import { AccountApi, Configuration, EventsApi, ExchangeApi, MarketApi, OrdersApi, PortfolioApi } from "kalshi-typescript";
import type { AxiosResponse } from "axios";
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from "~/lib/constants.js";

export interface KalshiApiConfig {
  apiKeyId?: string;
  privateKeyPath?: string;
  privateKeyPem?: string;
  baseUrl?: string;
  timeoutMs?: number;
  verbose?: boolean;
}

export class KalshiClient {
  readonly config: Required<Pick<KalshiApiConfig, "baseUrl" | "timeoutMs">> &
    Omit<KalshiApiConfig, "baseUrl" | "timeoutMs">;
  readonly account: AccountApi;
  readonly events: EventsApi;
  readonly exchange: ExchangeApi;
  readonly markets: MarketApi;
  readonly orders: OrdersApi;
  readonly portfolio: PortfolioApi;

  constructor(config: KalshiApiConfig) {
    this.config = {
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      ...config,
    };

    const sdkConfig = new Configuration({
      apiKey: this.config.apiKeyId,
      privateKeyPath: this.config.privateKeyPath,
      privateKeyPem: this.config.privateKeyPem,
      basePath: this.config.baseUrl,
      baseOptions: {
        timeout: this.config.timeoutMs,
      },
    });

    this.account = new AccountApi(sdkConfig);
    this.events = new EventsApi(sdkConfig);
    this.exchange = new ExchangeApi(sdkConfig);
    this.markets = new MarketApi(sdkConfig);
    this.orders = new OrdersApi(sdkConfig);
    this.portfolio = new PortfolioApi(sdkConfig);
  }

  hasAuth(): boolean {
    return Boolean(this.config.apiKeyId && (this.config.privateKeyPath || this.config.privateKeyPem));
  }

  async call<T>(endpoint: string, invoke: () => Promise<AxiosResponse<T>>): Promise<T> {
    if (this.config.verbose) {
      console.error(`[kalshi] ${endpoint}`);
    }
    try {
      const response = await invoke();
      if (this.config.verbose) {
        console.error(`[kalshi] <- ${response.status}`);
      }
      return response.data;
    } catch (error) {
      if (this.config.verbose) {
        const maybe = error as { response?: { status?: number }; message?: string };
        console.error(`[kalshi] !! ${maybe.response?.status ?? "ERR"} ${maybe.message ?? "Request failed"}`);
      }
      throw error;
    }
  }
}
