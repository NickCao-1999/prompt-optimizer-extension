import type { Scene, SceneId } from '@/shared/types';
import type { InferenceEngine } from '@/inference/engine';
import { SCENES, getScene } from './frameworks/scenes';

export interface ClassificationOutput {
  scene: Scene;
  confidence: number;
  secondaryScenes: Array<{ scene: Scene; confidence: number }>;
  usedRulesOnly: boolean;
}

export async function classifyPrompt(
  prompt: string,
  engine: InferenceEngine
): Promise<ClassificationOutput> {
  const keywordResult = matchByKeywords(prompt);
  if (keywordResult.confidence >= 0.7) {
    return {
      scene: keywordResult.scene,
      confidence: keywordResult.confidence,
      secondaryScenes: keywordResult.secondary,
      usedRulesOnly: true
    };
  }

  try {
    const llmResult = await classifyWithLLM(prompt, engine);
    if (llmResult) return llmResult;
  } catch {
    /* fallthrough */
  }

  return {
    scene: keywordResult.scene,
    confidence: keywordResult.confidence,
    secondaryScenes: keywordResult.secondary,
    usedRulesOnly: true
  };
}

interface KeywordResult {
  scene: Scene;
  confidence: number;
  secondary: Array<{ scene: Scene; confidence: number }>;
}

function matchByKeywords(prompt: string): KeywordResult {
  const scores: Array<{ scene: Scene; hit: number }> = [];

  for (const scene of SCENES) {
    if (scene.id === 'general') continue;
    let hit = 0;
    for (const keyword of scene.keywords) {
      if (prompt.toLowerCase().includes(keyword.toLowerCase())) hit++;
    }
    if (hit > 0) scores.push({ scene, hit });
  }

  scores.sort((a, b) => b.hit - a.hit);

  if (scores.length === 0) {
    return {
      scene: getScene('general'),
      confidence: 0.3,
      secondary: []
    };
  }

  const top = scores[0];
  const confidence = Math.min(0.9, 0.5 + top.hit * 0.1);
  const secondary = scores.slice(1, 3).map((s) => ({
    scene: s.scene,
    confidence: Math.min(0.7, 0.4 + s.hit * 0.1)
  }));

  return { scene: top.scene, confidence, secondary };
}

async function classifyWithLLM(
  prompt: string,
  engine: InferenceEngine
): Promise<ClassificationOutput | null> {
  const sceneList = SCENES.map(
    (s) => `- ${s.id}（${s.name}）：${s.description}`
  ).join('\n');

  const systemPrompt = [
    '你是提示词工程专家。请判断以下提示词最适合的场景类别。',
    '可选场景：',
    sceneList,
    '',
    '严格按 JSON 输出，不要 markdown 代码块：',
    '{"scene": "<id>", "confidence": 0.0-1.0, "reasoning": "简短理由"}'
  ].join('\n');

  const result = await engine.generate({
    systemPrompt,
    userPrompt: prompt,
    maxTokens: 200,
    temperature: 0.3
  });

  const parsed = safeParseJson(result.text);
  if (!parsed || typeof parsed.scene !== 'string') return null;

  const scene = getScene(parsed.scene);
  if (!scene) return null;

  return {
    scene,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.6)),
    secondaryScenes: [],
    usedRulesOnly: false
  };
}

function safeParseJson(text: string): Record<string, unknown> | null {
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

export function isSceneId(value: string): value is SceneId {
  return SCENES.some((s) => s.id === value);
}