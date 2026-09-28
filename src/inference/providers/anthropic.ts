import type { ProviderAdapter, ProviderConfig } from './base';
import type { GenerateOptions } from '../engine';

export class AnthropicAdapter implements ProviderAdapter {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';

  buildUrl(config: ProviderConfig): string {
    const base = config.baseUrl.replace(/\/$/, '');
    return `${base}/v1/messages`;
  }

  buildHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Origin': 'chrome-extension:://minikhnieamfofidfieidenbnjefpkik'
    };
  }

  buildRequestBody(
    systemPrompt: string,
    userPrompt: string,
    opts: GenerateOptions & { model: string }
  ): unknown {
    return {
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: opts.temperature ?? 0.6,
      stream: !!opts.onToken
    };
  }

  parseResponse(data: unknown): string {
    const d = data as { content?: Array<{ text?: string }> };
    return d.content?.[0]?.text ?? '';
  }

  parseStreamChunk(line: string): string | null {
    if (!line.startsWith('data: ')) return null;
    try {
      const chunk = JSON.parse(line.slice(6));
      if (chunk.type === 'content_block_delta') {
        return chunk.delta?.text ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }
}