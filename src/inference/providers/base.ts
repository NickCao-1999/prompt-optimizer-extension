import type { GenerateOptions } from '../engine';

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  buildUrl(config: ProviderConfig): string;
  buildHeaders(config: ProviderConfig): Record<string, string>;
  buildRequestBody(
    systemPrompt: string,
    userPrompt: string,
    opts: GenerateOptions & { model: string }
  ): unknown;
  parseResponse(data: unknown): string;
  parseStreamChunk?(line: string): string | null;
}