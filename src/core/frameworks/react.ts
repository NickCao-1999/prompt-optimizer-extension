import type { Framework } from '@/shared/types';

export const REACT: Framework = {
  id: 'react',
  name: 'ReAct',
  description: '用于 Agent 推理与工具调用的经典框架。',
  complexity: 'medium',
  applicableScenes: ['agent'],
  aliases: ['react', 'reason+act'],
  template: [
    '# Thought\n{thought}',
    '# Action\n{action}',
    '# Observation\n{observation}'
  ].join('\n\n'),
  slots: [
    {
      id: 'thought',
      name: 'Thought',
      description: '推理思路',
      required: true,
      generationOrder: 1,
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt:
        '你是提示词工程专家。请为 ReAct 框架生成 "Thought"（思考）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我查一下北京明天的天气并推荐穿搭',
          generatedValue:
            '需要先获取北京明天的天气数据，再根据温度与降水情况推荐合适穿搭。'
        }
      ]
    },
    {
      id: 'action',
      name: 'Action',
      description: '采取的行动',
      required: true,
      generationOrder: 2,
      dependsOn: ['thought'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt:
        '你是提示词工程专家。请为 ReAct 框架生成 "Action"（行动）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我查一下北京明天的天气并推荐穿搭',
          generatedValue: '调用天气查询工具，参数为城市=北京、日期=明天。'
        }
      ]
    },
    {
      id: 'observation',
      name: 'Observation',
      description: '观察结果',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt:
        '你是提示词工程专家。请为 ReAct 框架生成 "Observation"（观察）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我查一下北京明天的天气并推荐穿搭',
          generatedValue:
            '根据天气工具返回的温度、风力、降水概率，结合常见穿搭规则给出推荐。'
        }
      ]
    }
  ],
  examples: [
    {
      originalPrompt: '帮我查一下北京明天的天气并推荐穿搭',
      optimizedPrompt:
        '# Thought\n需要先获取北京明天的天气数据...\n\n# Action\n调用天气查询工具...\n\n# Observation\n根据天气工具返回的数据...'
    }
  ]
};