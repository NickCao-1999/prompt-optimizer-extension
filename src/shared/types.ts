// ==================== 场景 ====================

export type SceneId =
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'academic'
  | 'translation'
  | 'education'
  | 'business'
  | 'creative'
  | 'agent'
  | 'general';

export interface Scene {
  id: SceneId;
  name: string;
  description: string;
  keywords: string[];
  recommendedFrameworks: string[];
}

// ==================== 框架 ====================

export type FrameworkComplexity = 'simple' | 'medium' | 'complex';

export interface FewShotExample {
  userInput: string;
  generatedValue: string;
}

export interface SlotDefinition {
  id: string;
  name: string;
  description: string;
  required: boolean;
  dependsOn?: string[];
  generationOrder: number;
  jsonSchema: object;
  fewShotExamples: FewShotExample[];
  systemPrompt: string;
  maxTokens?: number;
}

export interface FrameworkExample {
  originalPrompt: string;
  optimizedPrompt: string;
}

export interface Framework {
  id: string;
  name: string;
  description: string;
  complexity: FrameworkComplexity;
  slots: SlotDefinition[];
  applicableScenes: SceneId[];
  template: string;
  examples: FrameworkExample[];
  aliases: string[];
}

// ==================== 分析 ====================

export type AmbiguityDimension =
  | 'objective_clarity'
  | 'context_completeness'
  | 'output_specification'
  | 'constraint_clarity'
  | 'audience_role';

export interface AmbiguityScore {
  dimension: AmbiguityDimension;
  score: 1 | 2 | 3;
  reasoning: string;
}

export type AmbiguityLevel =
  | 'clear'
  | 'mostly_clear'
  | 'ambiguous'
  | 'very_ambiguous';

export interface RecommendedFramework {
  framework: Framework;
  matchScore: number;
  reason: string;
}

export interface AnalysisResult {
  originalPrompt: string;
  ambiguityScores: AmbiguityScore[];
  totalAmbiguityScore: number;
  ambiguityLevel: AmbiguityLevel;
  scene: Scene;
  sceneConfidence: number;
  secondaryScenes: Array<{ scene: Scene; confidence: number }>;
  detectedFramework?: string;
  recommendedFrameworks: RecommendedFramework[];
  clarificationQuestions: string[];
  usedRulesOnly: boolean;
}

// ==================== 生成 ====================

export interface SlotGenerationRequest {
  frameworkId: string;
  slotId: string;
  userPrompt: string;
  generatedSlots: Record<string, string>;
  scene: SceneId;
}

export type SlotStatus = 'pending' | 'generating' | 'done' | 'failed';

export interface SlotGenerationResult {
  slotId: string;
  content: string;
  status: 'success' | 'failed' | 'retried';
  attempts: number;
  error?: string;
}

export interface GenerationProgress {
  frameworkId: string;
  totalSlots: number;
  completedSlots: number;
  currentSlot: string;
  slotStatus: Record<string, SlotStatus>;
}

export interface GenerationResult {
  frameworkId: string;
  frameworkName: string;
  slots: Record<string, SlotGenerationResult>;
  finalPrompt: string;
  metadata: {
    scene: SceneId;
    ambiguityScore: number;
    generationTimeMs: number;
    modelUsed: string;
    usedFallback: boolean;
  };
}

// ==================== 提供商配置 ====================

export interface ProviderSettings {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

// ==================== 用户偏好 ====================

export interface UserPreferences {
  enabled: boolean;
  triggerMode: 'button' | 'shortcut' | 'both';
  showClarification: boolean;
  maxClarificationQuestions: number;
  autoReplaceInput: boolean;
  cloudFallbackEnabled: boolean;
  provider: ProviderSettings;
}