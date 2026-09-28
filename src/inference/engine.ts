export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature?: number;
  jsonSchema?: object;
  onToken?: (token: string) => void;
}

export interface GenerateResult {
  text: string;
  json?: unknown;
  tokensGenerated: number;
  elapsedMs: number;
}

export interface InferenceEngine {
  readonly id: string;
  isReady(): boolean;
  generate(opts: GenerateOptions): Promise<GenerateResult>;
}

export interface ConnectionStatus {
  connected: boolean;
  baseUrl: string;
  model: string;
  error?: string;
  checkedAt: number;
}