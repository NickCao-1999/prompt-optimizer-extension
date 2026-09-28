import type { ProviderAdapter, ProviderConfig } from './base';
import type { GenerateOptions } from '../engine';

export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly id = 'openai-compatible';
  readonly name = 'OpenAI Compatible';

  buildUrl(config: ProviderConfig): string {
    const base = config.baseUrl.replace(/\/$/, '');
    return `${base}/chat/completions`;
  }

  buildHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...config.headers
    };
  }

  buildRequestBody(
    systemPrompt: string,
    userPrompt: string,
    opts: GenerateOptions & { model: string }
  ): unknown {
    return {
      model: opts.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens,
      stream: !!opts.onToken
    };
  }

  parseResponse(data: unknown): string {
    const d = data as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return d.choices?.[0]?.message?.content ?? '';
  }

  parseStreamChunk(line: string): string | null {
    if (!line.startsWith('data: ')) return null;
    const json = line.slice(6).trim();
    if (json === '[DONE]') return null;
    try {
      const chunk = JSON.parse(json);
      return chunk.choices?.[0]?.delta?.content ?? null;
    } catch {
      return null;
    }
  }
}