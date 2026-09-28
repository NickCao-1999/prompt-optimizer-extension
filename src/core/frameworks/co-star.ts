import type { Framework } from '@/shared/types';

export const CO_STAR: Framework = {
  id: 'co-star',
  name: 'CO-STAR',
  description:
    '适用于内容创作、营销文案、学术写作的结构化框架，强调上下文与受众。',
  complexity: 'medium',
  applicableScenes: ['writing', 'creative', 'academic', 'translation'],
  aliases: ['costar', 'co star', 'COSTAR'],
  template: [
    '# Context\n{context}',
    '# Objective\n{objective}',
    '# Style\n{style}',
    '# Tone\n{tone}',
    '# Audience\n{audience}',
    '# Response\n{response}'
  ].join('\n\n'),
  slots: [
    {
      id: 'context',
      name: 'Context',
      description: '任务的背景、场景、受众所处的环境',
      required: true,
      generationOrder: 1,
      jsonSchema: {
        type: 'string',
        minLength: 10,
        maxLength: 300
      },
      maxTokens: 200,
      systemPrompt: [
        '你是提示词工程专家。请为 CO-STAR 框架生成 "Context"（背景）部分。',
        '要求：',
        '1. 只输出 Context 部分的内容，不要加任何前缀或标签。',
        '2. 简洁、具体，提供任务必要的背景信息。',
        '3. 长度控制在 300 字以内。'
      ].join('\n'),
      fewShotExamples: [
        {
          userInput: '帮我写一篇关于AI的文章',
          generatedValue:
            '用户需要一篇面向大众的 AI 科普文章，用于发布在科技博客上，读者对 AI 有基础认知但非技术背景。'
        },
        {
          userInput: '写个小红书文案推广咖啡',
          generatedValue:
            '用户需要一条小红书风格的种草文案，用于推广一款新上市的手冲咖啡，目标读者是 20-35 岁都市白领。'
        }
      ]
    },
    {
      id: 'objective',
      name: 'Objective',
      description: '明确任务目标，即希望达成的结果',
      required: true,
      generationOrder: 2,
      dependsOn: ['context'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 200 },
      maxTokens: 150,
      systemPrompt: [
        '你是提示词工程专家。请为 CO-STAR 框架生成 "Objective"（目标）部分。',
        '要求：',
        '1. 只输出 Objective 部分的内容。',
        '2. 目标需具体、可验证。',
        '3. 长度控制在 200 字以内。'
      ].join('\n'),
      fewShotExamples: [
        {
          userInput: '帮我写一篇关于AI的文章',
          generatedValue:
            '写一篇 800 字左右的科普文章，用通俗语言解释 AI 的基本原理、典型应用和潜在风险。'
        }
      ]
    },
    {
      id: 'style',
      name: 'Style',
      description: '指定写作风格',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 100 },
      maxTokens: 80,
      systemPrompt:
        '你是提示词工程专家。请为 CO-STAR 框架生成 "Style"（风格）部分，只输出内容，控制在 100 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我写一篇关于AI的文章',
          generatedValue: '科普风格，类比丰富，避免专业术语。'
        }
      ]
    },
    {
      id: 'tone',
      name: 'Tone',
      description: '指定语气',
      required: true,
      generationOrder: 4,
      jsonSchema: { type: 'string', minLength: 3, maxLength: 80 },
      maxTokens: 60,
      systemPrompt:
        '你是提示词工程专家。请为 CO-STAR 框架生成 "Tone"（语气）部分，只输出内容，控制在 80 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我写一篇关于AI的文章',
          generatedValue: '友好、易懂、略带趣味，避免说教。'
        }
      ]
    },
    {
      id: 'audience',
      name: 'Audience',
      description: '明确目标受众',
      required: true,
      generationOrder: 5,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 120 },
      maxTokens: 80,
      systemPrompt:
        '你是提示词工程专家。请为 CO-STAR 框架生成 "Audience"（受众）部分，只输出内容，控制在 120 字以内。',
      fewShotExamples: [
        {
          userInput: '帮我写一篇关于AI的文章',
          generatedValue: '对 AI 有基础认知但非技术背景的普通读者。'
        }
      ]
    },
    {
  id: 'response',
  name: 'Response',
  description: '期望的输出格式，例如字数、结构、是否用 Markdown、包含哪些章节',
  required: true,
  generationOrder: 6,
  jsonSchema: { type: 'string', minLength: 10, maxLength: 250 },
  maxTokens: 200,
  systemPrompt: [
    '你是提示词工程专家。请为 CO-STAR 框架生成 "Response"（输出格式）部分。',
    '要求：',
    '1. 只描述"输出应该长什么样"，例如：字数范围、章节结构、格式（Markdown/表格/列表）、是否需要图表。',
    '2. 不要写背景、目标、受众等已有槽位的内容。',
    '3. 长度控制在 250 字以内。'
  ].join('\n'),
  fewShotExamples: [
    {
      userInput: '帮我写一篇关于AI的文章',
      generatedValue:
        'Markdown 格式，包含引言、3 个核心章节、结语。每节 200-300 字，适当使用小标题。全文 800 字左右。'
    },
    {
      userInput: '帮我撰写一份换热器 EI 论文大纲',
      generatedValue:
        '使用多级 Markdown 标题（## / ###）。每章列出 3-5 条要点，每条 ≤40 字。方法章节注明具体手段。附预期图表清单，含图题与表题。'
    }
  ]
}
  ],
  examples: [
    {
      originalPrompt: '帮我写一篇关于AI的文章',
      optimizedPrompt: [
        '# Context',
        '用户需要一篇面向大众的 AI 科普文章，用于发布在科技博客上。',
        '',
        '# Objective',
        '写一篇 800 字的科普文章，解释 AI 基本原理、应用和风险。',
        '',
        '# Style',
        '科普风格，类比丰富，避免专业术语。',
        '',
        '# Tone',
        '友好、易懂、略带趣味。',
        '',
        '# Audience',
        '对 AI 有基础认知但非技术背景的普通读者。',
        '',
        '# Response',
        'Markdown 格式，包含引言、3 个核心章节、结语。'
      ].join('\n')
    }
  ]
};