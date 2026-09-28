import type {
  Framework,
  Scene,
  SlotDefinition,
  SlotGenerationResult
} from '@/shared/types';
import type { InferenceEngine } from '@/inference/engine';
import {
  buildSlotSystemPrompt,
  buildSlotUserPrompt,
  type SlotGenerationContext
} from './context-injector';
import { cleanSlotContent, validateSlotContent } from './validator';
import { withRetry } from './retry-controller';

/** R1 蒸馏版额外 think 预算 */
const THINK_BUDGET_TOKENS = 500;

export interface GenerateSlotParams {
  slot: SlotDefinition;
  framework: Framework;
  scene: Scene;
  userPrompt: string;
  generatedSlots: Record<string, string>;
  engine: InferenceEngine;
  onToken?: (token: string) => void;
}

export async function generateSlot(
  params: GenerateSlotParams
): Promise<SlotGenerationResult> {
  const { slot, framework, scene, userPrompt, generatedSlots, engine } = params;

  const ctx: SlotGenerationContext = {
    userPrompt,
    frameworkName: framework.name,
    allSlots: framework.slots,
    generatedSlots,
    sceneName: scene.name
  };

  const systemPrompt = buildSlotSystemPrompt(slot, ctx);
  const userPromptForSlot = buildSlotUserPrompt(ctx);

  const baseMaxTokens = slot.maxTokens ?? 300;
  const totalMaxTokens = baseMaxTokens + THINK_BUDGET_TOKENS;

  let lastContent = '';
  let attemptsUsed = 0;

  try {
    const result = await withRetry(
      async () => {
        attemptsUsed++;

        const gen = await engine.generate({
          systemPrompt,
          userPrompt: userPromptForSlot,
          maxTokens: totalMaxTokens,
          temperature: 0.5,
          // 首版不使用流式，避免 think 块被实时展示
          // onToken: params.onToken
        });

        const cleaned = cleanSlotContent(gen.text, slot);
        const validation = validateSlotContent(cleaned, slot);

        if (!validation.valid) {
          throw new Error(validation.reason ?? '校验失败');
        }

        lastContent = cleaned;
        return cleaned;
      },
      {
        maxAttempts: 3,
        shouldRetry: (attempt, error) => {
          // 前两次重试，第三次不再重试
          return attempt < 3 && error.message.length > 0;
        }
      }
    );

    return {
      slotId: slot.id,
      content: result,
      status: 'success',
      attempts: attemptsUsed
    };
  } catch (e) {
    return {
      slotId: slot.id,
      content: lastContent,
      status: 'failed',
      attempts: attemptsUsed,
      error: (e as Error).message
    };
  }
}