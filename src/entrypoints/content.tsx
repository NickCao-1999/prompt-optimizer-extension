import { getActiveAdapter } from '@/platform/registry';
import { mountShadowUI, unmountShadowUI } from '@/ui/shadow-host';
import { OptimizeButton } from '@/ui/OptimizeButton';
import { ResultPanel, type UIPanelState } from '@/ui/ResultPanel';
import { sendToBackground } from '@/shared/messages';
import type { UserPreferences } from '@/shared/types';
import { useState, useEffect } from 'react';

export default defineContentScript({
  matches: [
    'https://kimi.com/*',
    'https://www.kimi.com/*',
    'https://kimi.moonshot.cn/*',
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://chat.deepseek.com/*',
    'https://gemini.google.com/*'
  ],
  async main() {
    console.log('[prompt-optimizer] content script loaded');

    const adapter = getActiveAdapter();
    console.log('[prompt-optimizer] adapter:', adapter.name);

    let prefs: UserPreferences | null = null;
    try {
      const res = await sendToBackground<{
        type: 'PREFERENCES';
        payload: UserPreferences;
      }>({ type: 'GET_PREFERENCES' });
      prefs = res?.payload ?? null;
    } catch {
      /* 忽略 */
    }
    if (prefs && !prefs.enabled) return;

console.log('[prompt-optimizer] prefs:', prefs);

    let input: HTMLElement | null = null;
    let currentTaskId: string | null = null;
    let panelState: UIPanelState = { phase: 'idle' };
    let setPanelStateRef: ((s: UIPanelState) => void) | null = null;

    // 监听 background 的进度消息
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type !== 'GENERATION_PROGRESS') return;

      const payload = message.payload as Record<string, unknown>;
      const taskId = payload.taskId as string | undefined;

      // 若无当前任务 ID，则接收第一条进度作为当前任务
      if (!taskId) return;
      if (currentTaskId && taskId !== currentTaskId) return;
      if (!currentTaskId) currentTaskId = taskId;

      if (!setPanelStateRef) return;

      // 合并进度信息到 UI state
      const patch: Partial<UIPanelState> = {};
      if (payload.stage === 'analyzing' || payload.status === 'analyzing') {
        patch.phase = 'analyzing';
      }
      if (payload.stage === 'analysis_done') {
        patch.phase = 'analysis_done';
        if (typeof payload.scene === 'string') patch.scene = payload.scene;
        if (typeof payload.sceneName === 'string') patch.sceneName = payload.sceneName;
        if (typeof payload.ambiguityScore === 'number')
          patch.ambiguityScore = payload.ambiguityScore;
        if (typeof payload.ambiguityLevel === 'string')
          patch.ambiguityLevel = payload.ambiguityLevel;
      }
      if (payload.stage === 'framework_selected') {
        patch.phase = 'generating';
        if (typeof payload.frameworkId === 'string')
          patch.frameworkId = payload.frameworkId;
        if (typeof payload.frameworkName === 'string')
          patch.frameworkName = payload.frameworkName;
        if (Array.isArray(payload.recommendedFrameworks)) {
          patch.recommendedFrameworks =
            payload.recommendedFrameworks as UIPanelState['recommendedFrameworks'];
        }
      }
      if (payload.stage === 'generating' || payload.status === 'generating') {
        patch.phase = 'generating';
        if (typeof payload.totalSlots === 'number')
          patch.totalSlots = payload.totalSlots;
        if (typeof payload.completedSlots === 'number')
          patch.completedSlots = payload.completedSlots;
        if (typeof payload.currentSlot === 'string')
          patch.currentSlot = payload.currentSlot;
        if (payload.slotStatus)
          patch.slotStatus =
            payload.slotStatus as UIPanelState['slotStatus'];
      }
      if (payload.stage === 'done' || payload.status === 'done') {
        patch.phase = 'done';
        const result = payload.result as
          | { finalPrompt?: string }
          | undefined;
        if (result?.finalPrompt) patch.finalPrompt = result.finalPrompt;
      }
      if (payload.status === 'failed') {
        patch.phase = 'failed';
        patch.error = (payload.error as string) ?? '未知错误';
      }

      panelState = { ...panelState, ...patch };
      setPanelStateRef(panelState);
    });

    function renderUI() {
      mountShadowUI(
        <App
          input={input}
          onSetStateRef={(fn) => {
            setPanelStateRef = fn;
          }}
          onTaskCreated={(id) => {
            currentTaskId = id;
          }}
        />
      );
    }

    function tryDetectInput() {
      const found = adapter.findInput();
      if (found && found !== input) {
        input = found;
        renderUI();
      } else if (!found && input) {
        input = null;
        renderUI();
      }
    }

    tryDetectInput();

    const observer = new MutationObserver(() => {
      tryDetectInput();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener('beforeunload', () => {
      observer.disconnect();
      unmountShadowUI();
    });
  }
});

// ==================== React App ====================

interface AppProps {
  input: HTMLElement | null;
  onSetStateRef: (fn: (s: UIPanelState) => void) => void;
  onTaskCreated: (id: string) => void;
}

function App({ input, onSetStateRef, onTaskCreated }: AppProps) {
  const [state, setState] = useState<UIPanelState>({ phase: 'idle' });

  useEffect(() => {
    onSetStateRef(setState);
  }, [onSetStateRef]);

  const adapter = getActiveAdapter();

  const handleOptimize = async () => {
    if (!input) return;
    const text = adapter.readInput(input).trim();
    if (!text) {
      setState({ phase: 'failed', error: '输入框为空' });
      return;
    }

    setState({ phase: 'analyzing' });

    try {
      const res = await sendToBackground<{
        type: string;
        payload: { taskId: string };
      }>({
        type: 'PROMPT_ANALYZE',
        payload: { text, pageUrl: location.href }
      });
      if (res?.payload?.taskId) {
        onTaskCreated(res.payload.taskId);
      }
    } catch (e) {
      setState({ phase: 'failed', error: (e as Error).message });
    }
  };

  const handleClose = () => {
    setState({ phase: 'idle' });
  };

  const handleSelectFramework = async (frameworkId: string) => {
    if (!input) return;
    const text = adapter.readInput(input).trim();
    setState({ ...state, frameworkId, phase: 'generating' });
    try {
      const res = await sendToBackground<{
        type: string;
        payload: { taskId: string };
      }>({
        type: 'GENERATION_START',
        payload: { frameworkId, userPrompt: text }
      });
      if (res?.payload?.taskId) {
        onTaskCreated(res.payload.taskId);
      }
    } catch (e) {
      setState({ phase: 'failed', error: (e as Error).message });
    }
  };

  const handleReplace = (text: string) => {
    if (input) {
      adapter.writeInput(input, text);
    }
  };

  return (
    <>
      <OptimizeButton
        anchor={input}
        adapter={adapter}
        onClick={handleOptimize}
        disabled={state.phase === 'analyzing' || state.phase === 'generating'}
      />
      {state.phase !== 'idle' && (
        <ResultPanel
          state={state}
          onClose={handleClose}
          onSelectFramework={handleSelectFramework}
          onReplace={handleReplace}
        />
      )}
    </>
  );
}