import type { ProviderAdapter } from './providers/base';
import { OpenAICompatibleAdapter } from './providers/openai-compatible';
import { AnthropicAdapter } from './providers/anthropic';

export interface ProviderPreset {
  id: string;
  name: string;
  adapter: ProviderAdapter;
  defaultBaseUrl: string;
  defaultModel: string;
  openaiCompatible: boolean;
}

const PRESETS: ProviderPreset[] = [
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    adapter: new OpenAICompatibleAdapter(),
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'deepseek-r1:7b',
    openaiCompatible: true
  },
  {
    id: 'zai',
    name: 'Z.ai (GLM)',
    adapter: new OpenAICompatibleAdapter(),
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    defaultModel: 'glm-5.3',
    openaiCompatible: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    adapter: new OpenAICompatibleAdapter(),
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    openaiCompatible: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    adapter: new OpenAICompatibleAdapter(),
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    openaiCompatible: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    adapter: new AnthropicAdapter(),
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-20250514',
    openaiCompatible: false
  }
];

export class ProviderRegistry {
  private presets = new Map<string, ProviderPreset>();

  constructor() {
    for (const p of PRESETS) this.presets.set(p.id, p);
  }

  getPreset(id: string): ProviderPreset | undefined {
    return this.presets.get(id);
  }

  listPresets(): ProviderPreset[] {
    return Array.from(this.presets.values());
  }

  getAdapter(id: string): ProviderAdapter {
    return this.presets.get(id)?.adapter ?? new OpenAICompatibleAdapter();
  }
}

export const providerRegistry = new ProviderRegistry();