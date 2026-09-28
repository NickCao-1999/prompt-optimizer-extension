/**
 * 约束解码适配器 — 适配 DeepSeek-R1 / GLM 等
 *
 * 模型输出可能包含 <think>...</think> 包裹的推理过程，
 * 需要剥离后再交给后续流程。
 */

export interface JsonSchemaLike {
  type?: string;
  properties?: Record<string, JsonSchemaLike>;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  enum?: unknown[];
}

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly rawText: string
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * 剥离 think 块，提取实际内容
 */
export function extractStructuredContent(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 找最后一个 </think>，取之后的内容
  const lastClose = cleaned.lastIndexOf('</think>');
  if (lastClose !== -1) {
    cleaned = cleaned.slice(lastClose + '</think>'.length);
  } else if (cleaned.includes('<think>')) {
    // 有 <think> 无 </think>，说明被截断，正文未生成
    return '';
  }

  // 清理开头空白
  cleaned = cleaned.replace(/^\s+/, '');

  // 剥离 markdown fence
  const fence = cleaned.match(/```(?:json|markdown|md)?\s*([\s\S]*?)```/i);
  if (fence) {
    cleaned = fence[1].trim();
  }

  return cleaned.trim();
}

/**
 * 从文本中抽取 JSON
 */
export function extractJson(text: string): unknown {
  const cleaned = extractStructuredContent(text);
  const trimmed = cleaned.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    /* fallthrough */
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      /* fallthrough */
    }
  }

  throw new SchemaValidationError('无法从模型输出中解析 JSON', text);
}

/**
 * 轻量 JSON Schema 校验
 */
export function validateSchema(value: unknown, schema: JsonSchemaLike): void {
  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      throw new SchemaValidationError(`期望 string，收到 ${typeof value}`, '');
    }
    if (schema.minLength != null && value.length < schema.minLength) {
      throw new SchemaValidationError(
        `字符串长度 ${value.length} < minLength ${schema.minLength}`,
        value
      );
    }
    if (schema.maxLength != null && value.length > schema.maxLength) {
      throw new SchemaValidationError(
        `字符串长度 ${value.length} > maxLength ${schema.maxLength}`,
        value
      );
    }
  } else if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new SchemaValidationError(`期望 object`, String(value));
    }
    const obj = value as Record<string, unknown>;
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in obj)) {
          throw new SchemaValidationError(
            `缺少必需字段 "${key}"`,
            JSON.stringify(obj)
          );
        }
      }
    }
  }
}

/**
 * 将模型输出强制转为符合 Schema 的结构
 */
export function applyJsonSchemaConstraint(
  rawText: string,
  schema: JsonSchemaLike
): unknown {
  if (schema.type === 'string') {
    return extractStructuredContent(rawText);
  }
  const json = extractJson(rawText);
  validateSchema(json, schema);
  return json;
}