import type {
  AnalysisResult,
  GenerationResult,
  UserPreferences
} from './types';

// ==================== Content → Background ====================

export type ContentToBackground =
  | {
      type: 'PROMPT_ANALYZE';
      payload: { text: string; pageUrl: string; frameworkId?: string };
    }
  | {
      type: 'FRAMEWORK_SELECT';
      payload: { frameworkId: string };
    }
  | {
      type: 'GENERATION_START';
      payload: { frameworkId: string; userPrompt: string };
    }
  | {
      type: 'RETRY_SLOT';
      payload: { frameworkId: string; slotId: string };
    }
  | { type: 'GET_PREFERENCES' }
  | { type: 'SET_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'HEALTH_CHECK' };

// ==================== Background → Content ====================

export type BackgroundToContent =
  | { type: 'TASK_CREATED'; payload: { taskId: string } }
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; payload: { error: string } }
  | {
      type: 'GENERATION_PROGRESS';
      payload: {
        taskId: string;
        status?: string;
        stage?: string;
        currentSlot?: string;
        totalSlots?: number;
        completedSlots?: number;
        elapsedMs?: number;
        scene?: string;
        sceneName?: string;
        ambiguityScore?: number;
        ambiguityLevel?: string;
        usedRulesOnly?: boolean;
        frameworkId?: string;
        frameworkName?: string;
        recommendedFrameworks?: Array<{
          id: string;
          name: string;
          matchScore: number;
          reason: string;
        }>;
        slotStatus?: Record<string, 'pending' | 'generating' | 'done' | 'failed'>;
        result?: GenerationResult;
        error?: string;
      };
    }
  | { type: 'GENERATION_COMPLETE'; payload: GenerationResult }
  | {
      type: 'GENERATION_ERROR';
      payload: { error: string; slotId?: string };
    }
  | { type: 'PREFERENCES'; payload: UserPreferences }
  | {
      type: 'CONNECTION_STATUS';
      payload: { connected: boolean; error?: string };
    };

// ==================== 统一类型 ====================

export type RuntimeMessage = ContentToBackground | BackgroundToContent;

// ==================== 工具函数 ====================

export function sendToBackground<T = unknown>(
  message: ContentToBackground
): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export function sendToTab<T = unknown>(
  tabId: number,
  message: BackgroundToContent
): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message) as Promise<T>;
}