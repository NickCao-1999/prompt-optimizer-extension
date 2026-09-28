import type { ConnectionStatus } from './engine';
import { ProviderHttpEngine } from './http-engine';
import { providerRegistry } from './provider-registry';
import { getPreferences } from '@/shared/storage';

class ConnectionManager {
  private engine: ProviderHttpEngine | null = null;

  getEngine(): ProviderHttpEngine {
    if (!this.engine) {
      this.engine = new ProviderHttpEngine(async () => {
        const prefs = await getPreferences();
        return prefs.provider;
      });
    }
    return this.engine;
  }

  async healthCheck(): Promise<ConnectionStatus> {
    const prefs = await getPreferences();
    const config = prefs.provider;
    const adapter = providerRegistry.getAdapter(config.providerId);

    try {
      const url =
        config.providerId === 'ollama'
          ? `${config.baseUrl.replace(/\/v1\/?$/, '')}/api/tags`
          : `${config.baseUrl.replace(/\/$/, '')}/models`;

      const res = await fetch(url, {
        headers: adapter.buildHeaders({
          id: config.providerId,
          name: config.providerId,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model
        }),
        signal: AbortSignal.timeout(8000)
      });

      return {
        connected: res.ok,
        baseUrl: config.baseUrl,
        model: config.model,
        error: res.ok ? undefined : `HTTP ${res.status}`,
        checkedAt: Date.now()
      };
    } catch (e) {
      return {
        connected: false,
        baseUrl: config.baseUrl,
        model: config.model,
        error: (e as Error).message,
        checkedAt: Date.now()
      };
    }
  }
}

export const connectionManager = new ConnectionManager();