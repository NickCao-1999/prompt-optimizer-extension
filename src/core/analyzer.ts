import type {
  AmbiguityScore,
  AmbiguityDimension,
  AmbiguityLevel
} from '@/shared/types';
import type { InferenceEngine } from '@/inference/engine';

const DIMENSIONS: {
  id: AmbiguityDimension;
  weight: number;
  name: string;
}[] = [
  { id: 'objective_clarity', weight: 0.30, name: '目标明确度' },
  { id: 'context_completeness', weight: 0.25, name: '上下文完整度' },
  { id: 'output_specification', weight: 0.20, name: '输出格式约束' },
  { id: 'constraint_clarity', weight: 0.15, name: '约束条件明确度' },
  { id: 'audience_role', weight: 0.10, name: '受众与角色定义' }
];

const VAGUE_VERBS = ['优化', '处理', '搞', '弄', '看看', '随便', '帮我', '整理'];
const FORMAT_KEYWORDS = ['字数', '格式', '列表', '表格', '段落', 'markdown', '字以内', '条目'];
const CONSTRAINT_KEYWORDS = ['不要', '必须', '不能', '限制', '排除', '避免', '仅限', '只允许'];
const ROLE_PATTERN = /(你是一[个位名]|作为一[个位名]|扮演|充当)/;
const AUDIENCE_KEYWORDS = ['面向', '受众', '读者', '用户是'];

export interface AnalysisOutput {
  ambiguityScores: AmbiguityScore[];
  totalScore: number;
  level: AmbiguityLevel;
  usedRulesOnly: boolean;
}

export async function analyzePrompt(
  prompt: string,
  engine: InferenceEngine
): Promise<AnalysisOutput> {
  const ruleResult = applyRules(prompt);
  const needsLLM = ruleResult.unmatched.length > 0 && prompt.length > 8;

  if (!needsLLM) {
    return finalize(ruleResult.scores, true);
  }

  try {
    const llmScores = await scoreWithLLM(prompt, engine, ruleResult.unmatched);
    const merged = mergeScores(ruleResult.scores, llmScores);
    return finalize(merged, false);
  } catch {
    return finalize(ruleResult.scores, true);
  }
}

interface RuleResult {
  scores: Record<AmbiguityDimension, AmbiguityScore>;
  unmatched: AmbiguityDimension[];
}

function applyRules(prompt: string): RuleResult {
  const scores: Partial<Record<AmbiguityDimension, AmbiguityScore>> = {};
  const unmatched: AmbiguityDimension[] = [];

  const hasVagueVerb = VAGUE_VERBS.some((v) => prompt.includes(v));
  if (hasVagueVerb) {
    scores.objective_clarity = {
      dimension: 'objective_clarity',
      score: 1,
      reasoning: '包含模糊动词，目标不明确'
    };
  } else if (prompt.length > 20) {
    scores.objective_clarity = {
      dimension: 'objective_clarity',
      score: 2,
      reasoning: '目标基本可推断'
    };
  } else {
    unmatched.push('objective_clarity');
  }

  if (prompt.length < 15) {
    scores.context_completeness = {
      dimension: 'context_completeness',
      score: 1,
      reasoning: '上下文极少'
    };
  } else if (prompt.length > 60) {
    scores.context_completeness = {
      dimension: 'context_completeness',
      score: 3,
      reasoning: '上下文充分'
    };
  } else {
    unmatched.push('context_completeness');
  }

  const hasFormat = FORMAT_KEYWORDS.some((k) => prompt.includes(k));
  scores.output_specification = {
    dimension: 'output_specification',
    score: hasFormat ? 3 : 1,
    reasoning: hasFormat ? '明确了输出格式' : '未指定输出格式'
  };

  const hasConstraint = CONSTRAINT_KEYWORDS.some((k) => prompt.includes(k));
  if (hasConstraint) {
    scores.constraint_clarity = {
      dimension: 'constraint_clarity',
      score: 3,
      reasoning: '包含明确约束'
    };
  } else {
    unmatched.push('constraint_clarity');
  }

  const hasRole = ROLE_PATTERN.test(prompt);
  const hasAudience = AUDIENCE_KEYWORDS.some((k) => prompt.includes(k));
  if (hasRole && hasAudience) {
    scores.audience_role = {
      dimension: 'audience_role',
      score: 3,
      reasoning: '明确指定了角色和受众'
    };
  } else if (hasRole || hasAudience) {
    scores.audience_role = {
      dimension: 'audience_role',
      score: 2,
      reasoning: '指定了角色或受众之一'
    };
  } else {
    scores.audience_role = {
      dimension: 'audience_role',
      score: 1,
      reasoning: '未指定角色和受众'
    };
  }

  for (const dim of DIMENSIONS) {
    if (!scores[dim.id]) {
      scores[dim.id] = {
        dimension: dim.id,
        score: 2,
        reasoning: '规则未覆盖，待 LLM 补充'
      };
    }
  }

  return {
    scores: scores as Record<AmbiguityDimension, AmbiguityScore>,
    unmatched
  };
}

async function scoreWithLLM(
  prompt: string,
  engine: InferenceEngine,
  dimensions: AmbiguityDimension[]
): Promise<Partial<Record<AmbiguityDimension, AmbiguityScore>>> {
  const dimList = dimensions
    .map((d) => `- ${d}: ${DIMENSIONS.find((x) => x.id === d)?.name}`)
    .join('\n');

  const systemPrompt = [
    '你是提示词工程专家。请为以下维度各打一个 1-3 分的评分：',
    dimList,
    '',
    '评分标准：1=模糊/缺失，2=基本清晰，3=清晰明确。',
    '严格按 JSON 格式输出，不要添加任何解释或 markdown 代码块：',
    '{"<dimension>": {"score": N, "reasoning": "简短理由"}, ...}'
  ].join('\n');

  const result = await engine.generate({
    systemPrompt,
    userPrompt: prompt,
    maxTokens: 300,
    temperature: 0.3
  });

  const parsed = safeParseJson(result.text);
  const out: Partial<Record<AmbiguityDimension, AmbiguityScore>> = {};

  for (const dim of dimensions) {
    const entry = parsed?.[dim];
    if (entry && typeof entry.score === 'number') {
      out[dim] = {
        dimension: dim,
        score: Math.max(1, Math.min(3, Math.round(entry.score))) as 1 | 2 | 3,
        reasoning: String(entry.reasoning ?? '')
      };
    }
  }

  return out;
}

function mergeScores(
  rule: Record<AmbiguityDimension, AmbiguityScore>,
  llm: Partial<Record<AmbiguityDimension, AmbiguityScore>>
): Record<AmbiguityDimension, AmbiguityScore> {
  const merged = { ...rule };
  for (const [dim, score] of Object.entries(llm)) {
    merged[dim as AmbiguityDimension] = score as AmbiguityScore;
  }
  return merged;
}

function finalize(
  scores: Record<AmbiguityDimension, AmbiguityScore>,
  usedRulesOnly: boolean
): AnalysisOutput {
  const ordered = DIMENSIONS.map((d) => scores[d.id]);
  const total = ordered.reduce((acc, s) => {
    const weight = DIMENSIONS.find((d) => d.id === s.dimension)!.weight;
    return acc + weight * (3 - s.score);
  }, 0);
  const totalScore = Math.round((total / 3) * 100);

  let level: AmbiguityLevel;
  if (totalScore <= 25) level = 'clear';
  else if (totalScore <= 50) level = 'mostly_clear';
  else if (totalScore <= 75) level = 'ambiguous';
  else level = 'very_ambiguous';

  return { ambiguityScores: ordered, totalScore, level, usedRulesOnly };
}

function safeParseJson(
  text: string
): Record<string, { score: number; reasoning: string }> | null {
  const trimmed = text.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(trimmed.slice(first, last + 1));
  } catch {
    return null;
  }
}