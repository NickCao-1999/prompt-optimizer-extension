import type { UserPreferences } from './types';

const PREF_KEY = 'user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  enabled: true,
  triggerMode: 'button',
  showClarification: true,
  maxClarificationQuestions: 3,
  autoReplaceInput: false,
  cloudFallbackEnabled: false,
  provider: {
    providerId: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    model: 'deepseek-r1:7b'
  }
};

export async function getPreferences(): Promise<UserPreferences> {
  const result = await chrome.storage.local.get(PREF_KEY);
  const stored = result[PREF_KEY] ?? {};
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    provider: {
      ...DEFAULT_PREFERENCES.provider,
      ...(stored.provider ?? {})
    }
  };
}

export async function setPreferences(
  patch: Partial<UserPreferences>
): Promise<UserPreferences> {
  const current = await getPreferences();
  const next: UserPreferences = {
    ...current,
    ...patch,
    provider: patch.provider
      ? { ...current.provider, ...patch.provider }
      : current.provider
  };
  await chrome.storage.local.set({ [PREF_KEY]: next });
  return next;
}

export async function resetPreferences(): Promise<UserPreferences> {
  await chrome.storage.local.set({ [PREF_KEY]: DEFAULT_PREFERENCES });
  return DEFAULT_PREFERENCES;
}