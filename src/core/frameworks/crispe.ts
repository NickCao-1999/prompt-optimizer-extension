import type { Framework } from '@/shared/types';

export const CRISPE: Framework = {
  id: 'crispe',
  name: 'CRISPE',
  description: '适用于商业分析、项目管理、Agent 编排的六要素框架。',
  complexity: 'medium',
  applicableScenes: ['business', 'analysis', 'agent'],
  aliases: ['crispe'],
  template: [
    '# Capacity and Role\n{capacity}',
    '# Request\n{request}',
    '# Insight\n{insight}',
    '# Style\n{style}',
    '# Personality\n{personality}',
    '# Experiment\n{experiment}'
  ].join('\n\n'),
  slots: [
    {
      id: 'capacity',
      name: 'Capacity and Role',
      description: 'AI 应扮演的角色和能力',
      required: true,
      generationOrder: 1,
      jsonSchema: { type: 'string', minLength: 10, maxLength: 200 },
      maxTokens: 150,
      systemPrompt: [
        '你是提示词工程专家。请为 CRISPE 框架生成 "Capacity and Role"（角色与能力）部分。',
        '要求：只输出该部分内容，简洁具体，控制在 200 字以内。'
      ].join('\n'),
      fewShotExamples: [
        {
          userInput: '帮我分析一下这个季度的销售数据',
          generatedValue: '你是一位拥有 10 年经验的高级数据分析师，擅长从销售数据中发现增长机会和风险信号。'
        }
      ]
    },
    {
      id: 'request',
      name: 'Request',
      description: '具体请求的任务',
      required: true,
      generationOrder: 2,
      dependsOn: ['capacity'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt: '你是提示词工程专家。请为 CRISPE 框架生成 "Request"（请求）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我分析一下这个季度的销售数据',
          generatedValue: '分析本季度销售数据，识别同比增长和下降的关键品类，指出 Top 3 增长机会和 Top 3 风险点。'
        }
      ]
    },
    {
      id: 'insight',
      name: 'Insight',
      description: '提供背景洞察和上下文',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt: '你是提示词工程专家。请为 CRISPE 框架生成 "Insight"（洞察）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我分析一下这个季度的销售数据',
          generatedValue: '公司主营业务为快消品，本季度受季节性因素和促销活动影响较大，需重点关注线上渠道表现。'
        }
      ]
    },
    {
      id: 'style',
      name: 'Style',
      description: '输出风格',
      required: true,
      generationOrder: 4,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 100 },
      maxTokens: 80,
      systemPrompt: '你是提示词工程专家。请为 CRISPE 框架生成 "Style"（风格）部分，只输出内容，控制在 100 字以内。',
      fewShotExamples: [
        { userInput: '帮我分析一下这个季度的销售数据', generatedValue: '结构化分析报告风格，数据驱动，结论先行。' }
      ]
    },
    {
      id: 'personality',
      name: 'Personality',
      description: 'AI 的语气和个性',
      required: true,
      generationOrder: 5,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 100 },
      maxTokens: 80,
      systemPrompt: '你是提示词工程专家。请为 CRISPE 框架生成 "Personality"（语气个性）部分，只输出内容，控制在 100 字以内。',
      fewShotExamples: [
        { userInput: '帮我分析一下这个季度的销售数据', generatedValue: '专业、客观、直接，避免模棱两可的表述。' }
      ]
    },
    {
      id: 'experiment',
      name: 'Experiment',
      description: '期望的实验或多种输出',
      required: false,
      generationOrder: 6,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 CRISPE 框架生成 "Experiment"（实验）部分，如无明确需求可输出"无需额外实验"。只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '帮我分析一下这个季度的销售数据', generatedValue: '请提供两种分析视角：乐观情形与保守情形，并说明各自假设。' }
      ]
    }
  ],
  examples: [
    {
      originalPrompt: '帮我分析一下这个季度的销售数据',
      optimizedPrompt: '# Capacity and Role\n你是一位高级数据分析师...\n\n# Request\n分析本季度销售数据...\n\n# Insight\n公司主营业务为快消品...\n\n# Style\n结构化分析报告风格...\n\n# Personality\n专业、客观、直接...\n\n# Experiment\n请提供两种分析视角...'
    }
  ]
};