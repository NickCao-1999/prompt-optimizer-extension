import type { Framework } from '@/shared/types';

export function composePrompt(
  framework: Framework,
  slots: Record<string, string>
): string {
  let result = framework.template;

  for (const slot of framework.slots) {
    const value = slots[slot.id] ?? '';
    result = result.replace(new RegExp(`\\{${slot.id}\\}`, 'g'), value);
  }

  result = result.replace(/\{[a-z_]+\}/g, '');

  return result.trim();
}