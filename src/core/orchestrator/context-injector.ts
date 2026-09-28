import type { SlotDefinition } from '@/shared/types';

export interface SlotGenerationContext {
  userPrompt: string;
  frameworkName: string;
  allSlots: SlotDefinition[];
  generatedSlots: Record<string, string>;
  sceneName: string;
}

/** 每个槽位的职责边界说明（避免职责重叠） */
const SLOT_ROLE_BOUNDARY: Record<string, string> = {
  context: '只描述背景、场景、受众所处的环境。不要写目标，不要写输出格式。',
  objective: '只写"要达成什么"。用动词开头，一句话说清目标。不要写背景，不要写输出格式。',
  style: '只写"写作风格"。例如：学术论文体、科普风格、营销文案体。用 1-2 句话描述风格特征。不要写语气。',
  tone: '只写"情绪语气"。例如：客观严谨、亲切活泼、权威严肃。用 1-2 句话描述语气。不要写风格。',
  audience: '只写"目标读者是谁"及其特点。不要重复背景。',
  response:
    '只写"输出格式要求"。例如：字数、章节结构、是否使用 Markdown、是否包含图表。绝对不要复述背景或目标。',
  // CRISPE
  capacity: '只写 AI 应扮演的角色和能力范围。',
  request: '只写用户希望 AI 完成的具体任务。',
  insight: '只写完成任务所需的背景信息、约束或洞察。',
  personality: '只写 AI 表达时的个性特征。',
  experiment: '只写希望 AI 尝试的多种输出或实验方向。',
  // RISEN
  role: '只写 AI 应扮演的角色。',
  instructions: '只写具体指令。',
  steps: '只写分步操作流程。',
  end_goal: '只写最终目标。',
  narrowing: '只写范围限制、边界条件。',
  // RTF / RACE / APE / TAG
  task: '只写任务描述。',
  action: '只写要执行的动作。',
  format: '只写输出格式要求。',
  explanation: '只写解释说明的深度与方式。',
  purpose: '只写目的。',
  execution: '只写执行方式。',
  goal: '只写目标。',
  thought: '只写推理思路。',
  observation: '只写观察结果。'
};

export function buildSlotSystemPrompt(
  slot: SlotDefinition,
  ctx: SlotGenerationContext
): string {
  const slotList = ctx.allSlots
    .map((s) => `- ${s.name}: ${s.description}`)
    .join('\n');

  const generatedList = Object.entries(ctx.generatedSlots)
    .map(([id, value]) => {
      const def = ctx.allSlots.find((s) => s.id === id);
      return def ? `- ${def.name}: ${value}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const schema = slot.jsonSchema as { maxLength?: number };
  const maxLen = schema.maxLength ?? 300;

  const roleBoundary =
    SLOT_ROLE_BOUNDARY[slot.id] ??
    `只写 ${slot.name} 对应的内容，不要涉及其他槽位。`;

  const parts = [
    `你是提示词工程专家。请为 ${ctx.frameworkName} 框架生成 "${slot.name}"（${slot.description}）部分。`,
    '',
    `框架全部要素：`,
    slotList,
    '',
    `当前场景：${ctx.sceneName}`,
    '',
    `⚠️ 本槽位职责边界：`,
    roleBoundary
  ];

  if (generatedList) {
    parts.push(
      '',
      `已生成的其他槽位（仅供参考上下文，**禁止复述或改写**）：`,
      generatedList
    );
  }

  parts.push(
    '',
    '要求：',
    '1. 只输出该槽位的内容，不要加任何标题、标签、前缀或说明。',
    '2. 不要重复其他槽位已经表达过的信息。',
    '3. 不要写"内容将…""本部分…""该任务…"这类元描述。',
    `4. 长度控制在 ${maxLen} 字以内。`,
    '5. 不要输出思考过程，不要使用 <think> 标签。'
  );

  if (slot.fewShotExamples.length > 0) {
    parts.push('', '参考示例：');
    for (const ex of slot.fewShotExamples.slice(0, 2)) {
      parts.push(
        `用户输入：${ex.userInput}`,
        `期望输出：${ex.generatedValue}`
      );
    }
  }

  return parts.join('\n');
}

export function buildSlotUserPrompt(ctx: SlotGenerationContext): string {
  return `用户原始需求：${ctx.userPrompt}`;
}