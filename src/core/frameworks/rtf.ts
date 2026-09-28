import type { Framework } from '@/shared/types';

export const RTF: Framework = {
  id: 'rtf',
  name: 'RTF',
  description: '最简三要素框架，适合快速明确任务。',
  complexity: 'simple',
  applicableScenes: ['coding', 'general'],
  aliases: ['rtf'],
  template: ['# Role\n{role}', '# Task\n{task}', '# Format\n{format}'].join('\n\n'),
  slots: [
    {
      id: 'role',
      name: 'Role',
      description: 'AI 扮演的角色',
      required: true,
      generationOrder: 1,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 100 },
      maxTokens: 80,
      systemPrompt: '你是提示词工程专家。请为 RTF 框架生成 "Role"（角色）部分，只输出内容，控制在 100 字以内。',
      fewShotExamples: [
        { userInput: '帮我写一段正则匹配邮箱', generatedValue: '你是一位精通正则表达式的高级工程师。' }
      ]
    },
    {
      id: 'task',
      name: 'Task',
      description: '具体任务',
      required: true,
      generationOrder: 2,
      dependsOn: ['role'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt: '你是提示词工程专家。请为 RTF 框架生成 "Task"（任务）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        { userInput: '帮我写一段正则匹配邮箱', generatedValue: '编写一段用于匹配标准邮箱地址的正则表达式，并附上使用示例。' }
      ]
    },
    {
      id: 'format',
      name: 'Format',
      description: '输出格式',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 150 },
      maxTokens: 100,
      systemPrompt: '你是提示词工程专家。请为 RTF 框架生成 "Format"（格式）部分，只输出内容，控制在 150 字以内。',
      fewShotExamples: [
        { userInput: '帮我写一段正则匹配邮箱', generatedValue: '先给出正则表达式代码块，再用 3-5 行说明匹配规则。' }
      ]
    }
  ],
  examples: [
    {
      originalPrompt: '帮我写一段正则匹配邮箱',
      optimizedPrompt: '# Role\n你是一位精通正则表达式的高级工程师。\n\n# Task\n编写一段用于匹配标准邮箱地址的正则表达式...\n\n# Format\n先给出正则表达式代码块...'
    }
  ]
};