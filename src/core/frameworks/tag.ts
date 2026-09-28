import type { Framework } from '@/shared/types';

export const TAG: Framework = {
  id: 'tag',
  name: 'TAG',
  description: '极简三要素框架，适合快速任务。',
  complexity: 'simple',
  applicableScenes: ['general', 'creative'],
  aliases: ['tag'],
  template: ['# Task\n{task}', '# Action\n{action}', '# Goal\n{goal}'].join('\n\n'),
  slots: [
    {
      id: 'task',
      name: 'Task',
      description: '任务',
      required: true,
      generationOrder: 1,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 150 },
      maxTokens: 100,
      systemPrompt: '你是提示词工程专家。请为 TAG 框架生成 "Task"（任务）部分，只输出内容，控制在 150 字以内。',
      fewShotExamples: [
        { userInput: '帮我想几个活动主题', generatedValue: '为一次线下读书会构思活动主题。' }
      ]
    },
    {
      id: 'action',
      name: 'Action',
      description: '行动',
      required: true,
      generationOrder: 2,
      dependsOn: ['task'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 TAG 框架生成 "Action"（行动）部分，只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '帮我想几个活动主题', generatedValue: '围绕"阅读与成长"构思 5 个主题，每个主题附一句简短文案。' }
      ]
    },
    {
      id: 'goal',
      name: 'Goal',
      description: '目标',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 150 },
      maxTokens: 100,
      systemPrompt: '你是提示词工程专家。请为 TAG 框架生成 "Goal"（目标）部分，只输出内容，控制在 150 字以内。',
      fewShotExamples: [
        { userInput: '帮我想几个活动主题', generatedValue: '主题需简洁、有画面感、易传播。' }
      ]
    }
  ],
  examples: [
    {
      originalPrompt: '帮我想几个活动主题',
      optimizedPrompt: '# Task\n为一次线下读书会构思活动主题。\n\n# Action\n围绕"阅读与成长"构思 5 个主题...\n\n# Goal\n主题需简洁、有画面感、易传播。'
    }
  ]
};