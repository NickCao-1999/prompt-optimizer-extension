import type { Scene } from '@/shared/types';

export const SCENES: Scene[] = [
  {
    id: 'coding',
    name: '编程开发',
    description: '代码生成、调试、审查、架构设计、API 使用',
    keywords: [
      '代码', '函数', 'bug', '调试', '重构', '优化性能', 'API',
      '报错', '异常', '单元测试', 'code', 'function', 'debug',
      'refactor', 'compile', 'exception', 'stack trace'
    ],
    recommendedFrameworks: ['rtf', 'crispe', 'risen']
  },
  {
    id: 'writing',
    name: '写作与内容创作',
    description: '文章、营销文案、报告、邮件、博客、社交媒体内容',
    keywords: [
      '写', '文章', '文案', '博客', '报告', '邮件', '公众号',
      '小红书', '标题', '正文', 'write', 'article', 'blog',
      'copywriting', 'essay'
    ],
    recommendedFrameworks: ['co-star', 'ape', 'tag']
  },
  {
    id: 'analysis',
    name: '数据分析',
    description: '数据清洗、趋势分析、报告撰写、指标解读',
    keywords: [
      '数据', '分析', '趋势', '指标', '统计', '图表', '报表',
      '同比', '环比', 'data', 'analyze', 'trend', 'metric',
      'statistics', 'dashboard'
    ],
    recommendedFrameworks: ['crispe', 'risen', 'race']
  },
  {
    id: 'academic',
    name: '学术与科研',
    description: '论文写作、文献综述、研究方法、实验设计',
    keywords: [
      '论文', '文献', '综述', '研究', '学术', '实验', '假设',
      '引用', 'paper', 'thesis', 'literature', 'research',
      'citation', 'abstract'
    ],
    recommendedFrameworks: ['risen', 'co-star', 'react']
  },
  {
    id: 'translation',
    name: '翻译与本地化',
    description: '文档翻译、术语统一、文化适配',
    keywords: [
      '翻译', '译成', '中文', '英文', '日文', '本地化', '术语',
      'translate', 'translation', 'localization'
    ],
    recommendedFrameworks: ['co-star', 'race', 'ape']
  },
  {
    id: 'education',
    name: '教育与培训',
    description: '课程设计、习题生成、概念解释、学习计划',
    keywords: [
      '教学', '课程', '习题', '讲解', '解释', '学习', '知识点',
      'teach', 'course', 'explain', 'tutorial', 'lesson'
    ],
    recommendedFrameworks: ['risen', 'co-star', 'race']
  },
  {
    id: 'business',
    name: '商业与运营',
    description: '商业计划、市场分析、策略规划、运营方案',
    keywords: [
      '商业', '市场', '营销', '运营', '策略', '增长', '转化',
      'GMV', 'business', 'marketing', 'strategy', 'growth',
      'operation'
    ],
    recommendedFrameworks: ['crispe', 'co-star', 'risen']
  },
  {
    id: 'creative',
    name: '创意与策划',
    description: '故事创作、角色设定、头脑风暴、创意策划',
    keywords: [
      '创意', '故事', '角色', '情节', '头脑风暴', '策划', '脚本',
      'story', 'character', 'brainstorm', 'creative', 'plot'
    ],
    recommendedFrameworks: ['co-star', 'risen', 'tag']
  },
  {
    id: 'agent',
    name: 'Agent 与工具调用',
    description: '多步任务编排、工具选择、工作流设计',
    keywords: [
      'agent', '智能体', '工作流', '编排', '工具调用', '多步',
      'workflow', 'orchestration', 'tool use', 'multi-step'
    ],
    recommendedFrameworks: ['react', 'crispe', 'risen']
  },
  {
    id: 'general',
    name: '通用问答',
    description: '日常咨询、知识查询、简单任务',
    keywords: [],
    recommendedFrameworks: ['ape', 'tag', 'rtf']
  }
];

export const SCENE_MAP: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s])
);

export function getScene(id: string): Scene {
  return SCENE_MAP[id] ?? SCENE_MAP.general;
}