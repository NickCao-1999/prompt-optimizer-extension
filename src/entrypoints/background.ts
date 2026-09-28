import { taskQueue } from '@/tasks/task-queue';
import { taskWorker } from '@/tasks/task-worker';
import { connectionManager } from '@/inference/model-manager';
import { getPreferences, setPreferences } from '@/shared/storage';
import type {
  ContentToBackground,
  BackgroundToContent
} from '@/shared/messages';

const KEEPALIVE_INTERVAL_MS = 20_000;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

function startKeepalive(): void {
  if (keepaliveTimer) return;
  keepaliveTimer = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      /* keepalive */
    });
  }, KEEPALIVE_INTERVAL_MS);
}

import { setupCorsRules } from '@/background/cors-rules';

export default defineBackground(() => {
  console.log('[prompt-optimizer] background loaded');

  // 0. 安装 CORS 规则
  setupCorsRules().catch((e) => {
    console.error('[prompt-optimizer] CORS setup failed:', e);
  });

  // 1. 恢复队列并启动 worker
  taskQueue.load().then(() => {
    taskWorker.tick();
    startKeepalive();
  });

  taskWorker.setProgressCallback((taskId, patch) => {
    chrome.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id == null) continue;
        chrome.tabs
          .sendMessage(tab.id, {
            type: 'GENERATION_PROGRESS',
            payload: { taskId, ...patch }
          })
          .catch(() => {
            /* tab 可能不支持 */
          });
      }
    });
  });

  chrome.runtime.onMessage.addListener(
    (
      message: ContentToBackground,
      _sender,
      sendResponse: (r: BackgroundToContent) => void
    ) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((e) =>
          sendResponse({
            type: 'ANALYSIS_ERROR',
            payload: { error: (e as Error).message }
          })
        );
      return true;
    }
  );
});

async function handleMessage(
  message: ContentToBackground
): Promise<BackgroundToContent> {
  switch (message.type) {
    case 'GET_PREFERENCES': {
      const prefs = await getPreferences();
      return { type: 'PREFERENCES', payload: prefs };
    }

    case 'SET_PREFERENCES': {
      const prefs = await setPreferences(message.payload);
      return { type: 'PREFERENCES', payload: prefs };
    }

    case 'HEALTH_CHECK': {
      const status = await connectionManager.healthCheck();
      return {
        type: 'CONNECTION_STATUS',
        payload: { connected: status.connected, error: status.error }
      };
    }

    case 'PROMPT_ANALYZE': {
      const task = await taskQueue.create(
        message.payload.text,
        message.payload.pageUrl,
        message.payload.frameworkId
      );
      taskWorker.tick();
      return { type: 'TASK_CREATED', payload: { taskId: task.id } };
    }

    case 'GENERATION_START': {
      const task = await taskQueue.create(
        message.payload.userPrompt,
        '',
        message.payload.frameworkId
      );
      taskWorker.tick();
      return { type: 'TASK_CREATED', payload: { taskId: task.id } };
    }

    case 'RETRY_SLOT': {
      throw new Error('Not implemented yet: RETRY_SLOT');
    }

    default:
      throw new Error(
        `Unknown message type: ${(message as { type: string }).type}`
      );
  }
}