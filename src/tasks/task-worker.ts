import { taskQueue, type OptimizationTask } from './task-queue';
import { getFramework } from '@/core/frameworks';
import { analyzePrompt } from '@/core/analyzer';
import { classifyPrompt } from '@/core/classifier';
import { matchFrameworks } from '@/core/matcher';
import { orchestrateGeneration } from '@/core/orchestrator';
import { connectionManager } from '@/inference/model-manager';
import type { RecommendedFramework } from '@/shared/types';

type ProgressCallback = (taskId: string, patch: Record<string, unknown>) => void;

class TaskWorker {
  private running = false;
  private currentTaskId: string | null = null;
  private abortController: AbortController | null = null;
  private onProgress: ProgressCallback | null = null;
  private loopScheduled = false;

  setProgressCallback(cb: ProgressCallback): void {
    this.onProgress = cb;
  }

  isRunning(): boolean {
    return this.running;
  }

  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  async tick(): Promise<void> {
    if (this.running || this.loopScheduled) return;
    this.loopScheduled = true;

    try {
      while (true) {
        const task = await taskQueue.nextQueued();
        if (!task) break;

        this.running = true;
        this.currentTaskId = task.id;
        this.abortController = new AbortController();

        try {
          await this.processTask(task);
        } catch (e) {
          await taskQueue.update(task.id, {
            status: 'failed',
            error: (e as Error).message,
            completedAt: Date.now()
          });
          this.emit(task.id, { status: 'failed', error: (e as Error).message });
        } finally {
          this.running = false;
          this.currentTaskId = null;
          this.abortController = null;
        }
      }
    } finally {
      this.loopScheduled = false;
    }
  }

  private async processTask(task: OptimizationTask): Promise<void> {
    const engine = connectionManager.getEngine();

    await taskQueue.update(task.id, { status: 'analyzing' });
    this.emit(task.id, { status: 'analyzing', stage: 'analyzing' });

    const [analysis, classification] = await Promise.all([
      analyzePrompt(task.originalPrompt, engine),
      classifyPrompt(task.originalPrompt, engine)
    ]);

    const scene = classification.scene;
    const ambiguityScore = analysis.totalScore;

    this.emit(task.id, {
      stage: 'analysis_done',
      scene: scene.id,
      sceneName: scene.name,
      ambiguityScore,
      ambiguityLevel: analysis.level,
      usedRulesOnly: analysis.usedRulesOnly && classification.usedRulesOnly
    });

    let framework = task.frameworkId
      ? getFramework(task.frameworkId)
      : undefined;

    let recommendedFrameworks: RecommendedFramework[] = [];

    if (!framework) {
      recommendedFrameworks = matchFrameworks(scene, task.originalPrompt);
      framework = recommendedFrameworks[0]?.framework;
    }

    if (!framework) throw new Error('无法匹配到合适的框架');

    this.emit(task.id, {
      stage: 'framework_selected',
      frameworkId: framework.id,
      frameworkName: framework.name,
      recommendedFrameworks: recommendedFrameworks.map((r: RecommendedFramework) => ({
        id: r.framework.id,
        name: r.framework.name,
        matchScore: r.matchScore,
        reason: r.reason
      }))
    });

    await taskQueue.update(task.id, { status: 'generating' });

    const result = await orchestrateGeneration({
      userPrompt: task.originalPrompt,
      framework,
      scene,
      ambiguityScore,
      engine,
      signal: this.abortController?.signal,
      onProgress: (progress) => {
        this.emit(task.id, {
          stage: 'generating',
          frameworkId: progress.frameworkId,
          totalSlots: progress.totalSlots,
          completedSlots: progress.completedSlots,
          currentSlot: progress.currentSlot,
          slotStatus: progress.slotStatus
        });
      },
      onSlotComplete: (slotId, content) => {
        this.emit(task.id, { stage: 'slot_complete', slotId, content });
      }
    });

    await taskQueue.update(task.id, {
      status: 'done',
      result,
      completedAt: Date.now(),
      progress: {
        stage: 'done',
        currentSlot: '',
        completedSlots: framework.slots.length,
        totalSlots: framework.slots.length,
        elapsedMs: result.metadata.generationTimeMs
      }
    });

    this.emit(task.id, { status: 'done', stage: 'done', result });
  }

  private emit(taskId: string, patch: Record<string, unknown>): void {
    this.onProgress?.(taskId, patch);
  }

  cancel(): void {
    this.abortController?.abort();
  }
}

export const taskWorker = new TaskWorker();