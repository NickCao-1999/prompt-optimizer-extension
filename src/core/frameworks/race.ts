import type { Framework } from '@/shared/types';

export const RACE: Framework = {
  id: 'race',
  name: 'RACE',
  description: '适用于分析、翻译、教育场景的四要素框架。',
  complexity: 'simple',
  applicableScenes: ['analysis', 'translation', 'education'],
  aliases: ['race'],
  template: [
    '# Role\n{role}',
    '# Action\n{action}',
    '# Context\n{context}',
    '# Explanation\n{explanation}'
  ].join('\n\n'),
  slots: [
    {
      id: 'role',
      name: 'Role',
      description: 'AI 扮演的角色',
      required: true,
      generationOrder: 1,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 150 },
      maxTokens: 100,
      systemPrompt: '你是提示词工程专家。请为 RACE 框架生成 "Role"（角色）部分，只输出内容，控制在 150 字以内。',
      fewShotExamples: [
        { userInput: '把这段英文翻译成中文', generatedValue: '你是一位专业中英互译译者，精通技术文档翻译。' }
      ]
    },
    {
      id: 'action',
      name: 'Action',
      description: '要执行的动作',
      required: true,
      generationOrder: 2,
      dependsOn: ['role'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt: '你是提示词工程专家。请为 RACE 框架生成 "Action"（动作）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        { userInput: '把这段英文翻译成中文', generatedValue: '将用户提供的英文段落翻译成中文，保持原意与技术准确性。' }
      ]
    },
    {
      id: 'context',
      name: 'Context',
      description: '背景上下文',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt: '你是提示词工程专家。请为 RACE 框架生成 "Context"（上下文）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        { userInput: '把这段英文翻译成中文', generatedValue: '文本属于技术文档，面向中文开发者读者，需保持术语一致。' }
      ]
    },
    {
      id: 'explanation',
      name: 'Explanation',
      description: '期望的说明或补充',
      required: false,
      generationOrder: 4,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 RACE 框架生成 "Explanation"（说明）部分，只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '把这段英文翻译成中文', generatedValue: '对生僻术语附上英文原文，必要时给出 1-2 句译注。' }
      ]
    }
  ],
  examples: [
    {
      originalPrompt: '把这段英文翻译成中文',
      optimizedPrompt: '# Role\n你是一位专业中英互译译者...\n\n# Action\n将用户提供的英文段落翻译成中文...\n\n# Context\n文本属于技术文档...\n\n# Explanation\n对生僻术语附上英文原文...'
    }
  ]
};