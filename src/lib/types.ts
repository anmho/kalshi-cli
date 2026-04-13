export interface CliConfig {
  apiKeyId?: string;
  privateKeyPath?: string;
  privateKeyPem?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ConfigContext {
  config: CliConfig;
  configPath: string;
  dataDir: string;
}

export type OutputFormat = "table" | "wide" | "json";

export interface OutputOptions {
  json?: boolean;
  output?: OutputFormat;
}

export interface CommandOverrides extends CliConfig {
  config?: string;
  verbose?: boolean;
  output?: OutputFormat;
  json?: boolean;
}
