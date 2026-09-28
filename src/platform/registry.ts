import type { PlatformAdapter } from './base';
import { generalAdapter } from './general';
import { kimiAdapter } from './kimi';

const ADAPTERS: PlatformAdapter[] = [kimiAdapter, generalAdapter];

export function getActiveAdapter(): PlatformAdapter {
  const host = location.hostname;
  for (const adapter of ADAPTERS) {
    if (adapter.hostname.test(host)) return adapter;
  }
  return generalAdapter;
}