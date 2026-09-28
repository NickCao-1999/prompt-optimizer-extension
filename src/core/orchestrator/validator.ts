import type { SlotDefinition } from '@/shared/types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateSlotContent(
  content: string,
  slot: SlotDefinition
): ValidationResult {
  const trimmed = content.trim();

  if (!trimmed) return { valid: false, reason: '内容为空' };

  if (trimmed.includes('<think>') || trimmed.includes('</think>')) {
    return { valid: false, reason: '包含未剥离的 think 标签' };
  }

  const schema = slot.jsonSchema as {
    minLength?: number;
    maxLength?: number;
  };

  if (schema.minLength && trimmed.length < schema.minLength) {
    return {
      valid: false,
      reason: `长度 ${trimmed.length} 小于最小要求 ${schema.minLength}`
    };
  }

  if (schema.maxLength && trimmed.length > schema.maxLength * 2) {
    return {
      valid: false,
      reason: `长度 ${trimmed.length} 严重超出上限 ${schema.maxLength}`
    };
  }

  const badPrefixes = ['好的，', '根据您的要求，', '以下是', `${slot.name}:`];
  for (const prefix of badPrefixes) {
    if (trimmed.startsWith(prefix)) {
      return { valid: false, reason: `包含多余前缀：${prefix}` };
    }
  }

  return { valid: true };
}

export function cleanSlotContent(content: string, slot: SlotDefinition): string {
  let cleaned = content;

  // 1. 剥离 think 块
  const lastClose = cleaned.lastIndexOf('</think>');
  if (lastClose !== -1) {
    cleaned = cleaned.slice(lastClose + '</think>'.length);
  }
  cleaned = cleaned.replace(/^\s+/, '').trim();

  // 2. 剥离 markdown 代码块
  cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '');

  // 3. 强化前缀剥离：支持多种格式
  //    - "Context:"
  //    - "**Context**:"
  //    - "**Context**"
  //    - "### Context"
  //    - "## Context"
  //    - "# Context"
  const escaped = slot.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefixPatterns = [
    new RegExp(`^\\*\\*${escaped}\\*\\*\\s*[:：]\\s*`, 'i'),
    new RegExp(`^\\*\\*${escaped}\\*\\*\\s*`, 'i'),
    new RegExp(`^#{1,6}\\s+${escaped}\\s*[:：]?\\s*`, 'i'),
    new RegExp(`^${escaped}\\s*[:：]\\s*`, 'i')
  ];
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 4. 剥离首尾引号
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith('「') && cleaned.endsWith('」'))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}