import type {
  Framework,
  GenerationProgress,
  GenerationResult,
  Scene
} from '@/shared/types';
import type { InferenceEngine } from '@/inference/engine';
import { generateSlot } from './slot-generator';
import { composePrompt } from './composer';

export interface OrchestrateParams {
  userPrompt: string;
  framework: Framework;
  scene: Scene;
  ambiguityScore: number;
  engine: InferenceEngine;
  onProgress?: (progress: GenerationProgress) => void;
  onSlotComplete?: (slotId: string, content: string) => void;
  signal?: AbortSignal;
}

export async function orchestrateGeneration(
  params: OrchestrateParams
): Promise<GenerationResult> {
  const { userPrompt, framework, scene, ambiguityScore, engine, signal } = params;
  const startTime = Date.now();

  const sortedSlots = [...framework.slots].sort(
    (a, b) => a.generationOrder - b.generationOrder
  );

  const slotStatus: Record<
    string,
    'pending' | 'generating' | 'done' | 'failed'
  > = Object.fromEntries(sortedSlots.map((s) => [s.id, 'pending']));

  const generatedSlots: Record<string, string> = {};
  const slotResults: GenerationResult['slots'] = {};

  params.onProgress?.({
    frameworkId: framework.id,
    totalSlots: sortedSlots.length,
    completedSlots: 0,
    currentSlot: '',
    slotStatus: { ...slotStatus }
  });

  for (const slot of sortedSlots) {
    if (signal?.aborted) {
      throw new Error('Generation aborted');
    }

    slotStatus[slot.id] = 'generating';
    params.onProgress?.({
      frameworkId: framework.id,
      totalSlots: sortedSlots.length,
      completedSlots: Object.keys(generatedSlots).length,
      currentSlot: slot.id,
      slotStatus: { ...slotStatus }
    });

    const result = await generateSlot({
      slot,
      framework,
      scene,
      userPrompt,
      generatedSlots,
      engine
    });

    slotResults[slot.id] = result;

    if (result.status === 'success') {
      generatedSlots[slot.id] = result.content;
      slotStatus[slot.id] = 'done';
      params.onSlotComplete?.(slot.id, result.content);
    } else {
      slotStatus[slot.id] = 'failed';
      generatedSlots[slot.id] = `[生成失败：${result.error ?? '未知错误'}]`;
    }

    params.onProgress?.({
      frameworkId: framework.id,
      totalSlots: sortedSlots.length,
      completedSlots: Object.keys(generatedSlots).length,
      currentSlot: slot.id,
      slotStatus: { ...slotStatus }
    });
  }

  const finalPrompt = composePrompt(framework, generatedSlots);

  return {
    frameworkId: framework.id,
    frameworkName: framework.name,
    slots: slotResults,
    finalPrompt,
    metadata: {
      scene: scene.id,
      ambiguityScore,
      generationTimeMs: Date.now() - startTime,
      modelUsed: engine.id,
      usedFallback: false
    }
  };
}