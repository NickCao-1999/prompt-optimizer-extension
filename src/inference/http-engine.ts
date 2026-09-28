import type {
  GenerateOptions,
  GenerateResult,
  InferenceEngine
} from './engine';
import { extractStructuredContent } from './constraint-adapter';
import { providerRegistry } from './provider-registry';
import type { ProviderSettings } from '@/shared/types';

export interface HttpEngineConfig {
  timeoutMs?: number;
}

export class ProviderHttpEngine implements InferenceEngine {
  readonly id = 'provider-http';

  constructor(
    private getSettings: () => Promise<ProviderSettings>,
    private config: HttpEngineConfig = {}
  ) {}

  isReady(): boolean {
    return true;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const settings = await this.getSettings();
    const adapter = providerRegistry.getAdapter(settings.providerId);

    const providerConfig = {
      id: settings.providerId,
      name: settings.providerId,
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      model: settings.model
    };

    const url = adapter.buildUrl(providerConfig);
    const headers = adapter.buildHeaders(providerConfig);
    const body = adapter.buildRequestBody(
      opts.systemPrompt,
      opts.userPrompt,
      { ...opts, model: settings.model }
    );

    const start = performance.now();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 180_000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `${adapter.name} API error: ${response.status} ${errText.slice(0, 200)}`
      );
    }

    let fullText = '';
    let tokensGenerated = 0;

    if (opts.onToken && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const token = adapter.parseStreamChunk?.(line);
          if (token) {
            fullText += token;
            tokensGenerated++;
            opts.onToken(token);
          }
        }
      }
    } else {
      const data = await response.json();
      fullText = adapter.parseResponse(data);
      tokensGenerated = fullText.length;
    }

    const cleaned = extractStructuredContent(fullText);

    return {
      text: cleaned,
      json: undefined,
      tokensGenerated,
      elapsedMs: performance.now() - start
    };
  }
}