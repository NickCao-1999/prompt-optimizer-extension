import type { Framework } from '@/shared/types';

export const APE: Framework = {
  id: 'ape',
  name: 'APE',
  description: '最简三要素框架，适合写作与通用场景。',
  complexity: 'simple',
  applicableScenes: ['writing', 'general', 'creative'],
  aliases: ['ape'],
  template: ['# Action\n{action}', '# Purpose\n{purpose}', '# Execution\n{execution}'].join('\n\n'),
  slots: [
    {
      id: 'action',
      name: 'Action',
      description: '要执行的动作',
      required: true,
      generationOrder: 1,
      jsonSchema: { type: 'string', minLength: 10, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 APE 框架生成 "Action"（动作）部分，只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个产品介绍', generatedValue: '撰写一段面向潜在客户的产品介绍文案。' }
      ]
    },
    {
      id: 'purpose',
      name: 'Purpose',
      description: '目的',
      required: true,
      generationOrder: 2,
      dependsOn: ['action'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 APE 框架生成 "Purpose"（目的）部分，只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个产品介绍', generatedValue: '突出产品的核心卖点，激发读者兴趣并促成咨询。' }
      ]
    },
    {
      id: 'execution',
      name: 'Execution',
      description: '执行方式',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 APE 框架生成 "Execution"（执行）部分，只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个产品介绍', generatedValue: '三段式结构：痛点共鸣、产品亮点、行动号召，总字数 200 字以内。' }
      ]
    }
  ],
  examples: [
    {
      originalPrompt: '帮我写个产品介绍',
      optimizedPrompt:
        '# Action\n撰写一段面向潜在客户的产品介绍文案。\n\n# Purpose\n突出产品的核心卖点...\n\n# Execution\n三段式结构...'
    }
  ]
};