import type { Framework } from '@/shared/types';

export const RISEN: Framework = {
  id: 'risen',
  name: 'RISEN',
  description: '适用于编程、学术、教育场景的结构化框架。',
  complexity: 'medium',
  applicableScenes: ['coding', 'academic', 'education'],
  aliases: ['risen'],
  template: [
    '# Role\n{role}',
    '# Instructions\n{instructions}',
    '# Steps\n{steps}',
    '# End Goal\n{end_goal}',
    '# Narrowing\n{narrowing}'
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
      systemPrompt: '你是提示词工程专家。请为 RISEN 框架生成 "Role"（角色）部分，只输出内容，控制在 150 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个 Python 爬虫', generatedValue: '你是一位资深 Python 后端工程师，精通网络爬虫、反爬策略与数据清洗。' }
      ]
    },
    {
      id: 'instructions',
      name: 'Instructions',
      description: '具体指令',
      required: true,
      generationOrder: 2,
      dependsOn: ['role'],
      jsonSchema: { type: 'string', minLength: 10, maxLength: 300 },
      maxTokens: 200,
      systemPrompt: '你是提示词工程专家。请为 RISEN 框架生成 "Instructions"（指令）部分，只输出内容，控制在 300 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个 Python 爬虫', generatedValue: '编写一个爬取某电商网站商品列表的 Python 爬虫，包含请求、解析、存储三个模块。' }
      ]
    },
    {
      id: 'steps',
      name: 'Steps',
      description: '执行步骤',
      required: true,
      generationOrder: 3,
      jsonSchema: { type: 'string', minLength: 10, maxLength: 400 },
      maxTokens: 250,
      systemPrompt: '你是提示词工程专家。请为 RISEN 框架生成 "Steps"（步骤）部分，只输出内容，控制在 400 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个 Python 爬虫', generatedValue: '1. 分析目标页面结构\n2. 使用 requests 获取列表页\n3. 用 BeautifulSoup 解析商品信息\n4. 存入 CSV 文件\n5. 加入随机延迟与 User-Agent 轮换' }
      ]
    },
    {
      id: 'end_goal',
      name: 'End Goal',
      description: '最终目标',
      required: true,
      generationOrder: 4,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 RISEN 框架生成 "End Goal"（最终目标）部分，只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个 Python 爬虫', generatedValue: '交付一个可直接运行、结构清晰、具备基础反爬能力的爬虫脚本。' }
      ]
    },
    {
      id: 'narrowing',
      name: 'Narrowing',
      description: '范围限制',
      required: false,
      generationOrder: 5,
      jsonSchema: { type: 'string', minLength: 5, maxLength: 200 },
      maxTokens: 120,
      systemPrompt: '你是提示词工程专家。请为 RISEN 框架生成 "Narrowing"（范围限制）部分，只输出内容，控制在 200 字以内。',
      fewShotExamples: [
        { userInput: '帮我写个 Python 爬虫', generatedValue: '仅处理静态页面，不涉及登录和验证码，代码不超过 150 行。' }
      ]
    }
  ],
  examples: [
    {
      originalPrompt: '帮我写个 Python 爬虫',
      optimizedPrompt: '# Role\n你是一位资深 Python 后端工程师...\n\n# Instructions\n编写一个爬取某电商网站商品列表的 Python 爬虫...\n\n# Steps\n1. 分析目标页面结构...\n\n# End Goal\n交付一个可直接运行的爬虫脚本...\n\n# Narrowing\n仅处理静态页面...'
    }
  ]
};