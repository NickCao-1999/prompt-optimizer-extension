import type { GenerationResult } from '@/shared/types';

export type TaskStatus =
  | 'queued'
  | 'analyzing'
  | 'generating'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface TaskProgress {
  stage: string;
  currentSlot: string;
  completedSlots: number;
  totalSlots: number;
  elapsedMs: number;
}

export interface OptimizationTask {
  id: string;
  originalPrompt: string;
  pageUrl: string;
  frameworkId?: string;
  status: TaskStatus;
  progress: TaskProgress;
  result?: GenerationResult;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

const QUEUE_KEY = 'task_queue';

class TaskQueue {
  private tasks: Map<string, OptimizationTask> = new Map();
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    const stored = await chrome.storage.local.get(QUEUE_KEY);
    const list: OptimizationTask[] = stored[QUEUE_KEY] ?? [];
    this.tasks = new Map(list.map((t) => [t.id, t]));
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await chrome.storage.local.set({
      [QUEUE_KEY]: Array.from(this.tasks.values())
    });
  }

  async create(
    originalPrompt: string,
    pageUrl: string,
    frameworkId?: string
  ): Promise<OptimizationTask> {
    await this.load();
    const task: OptimizationTask = {
      id: crypto.randomUUID(),
      originalPrompt,
      pageUrl,
      frameworkId,
      status: 'queued',
      progress: {
        stage: 'queued',
        currentSlot: '',
        completedSlots: 0,
        totalSlots: 0,
        elapsedMs: 0
      },
      createdAt: Date.now()
    };
    this.tasks.set(task.id, task);
    await this.persist();
    return task;
  }

  async update(
    id: string,
    patch: Partial<OptimizationTask>
  ): Promise<OptimizationTask | undefined> {
    await this.load();
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const next = { ...task, ...patch };
    this.tasks.set(id, next);
    await this.persist();
    return next;
  }

  async updateProgress(id: string, progress: Partial<TaskProgress>): Promise<void> {
    await this.load();
    const task = this.tasks.get(id);
    if (!task) return;
    task.progress = { ...task.progress, ...progress };
    this.tasks.set(id, task);
    await this.persist();
  }

  async get(id: string): Promise<OptimizationTask | undefined> {
    await this.load();
    return this.tasks.get(id);
  }

  async list(): Promise<OptimizationTask[]> {
    await this.load();
    return Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  async nextQueued(): Promise<OptimizationTask | undefined> {
    await this.load();
    const queued = Array.from(this.tasks.values())
      .filter((t) => t.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);
    return queued[0];
  }

  async cancel(id: string): Promise<boolean> {
    await this.load();
    const task = this.tasks.get(id);
    if (!task) return false;
    if (task.status !== 'queued') return false;
    task.status = 'cancelled';
    this.tasks.set(id, task);
    await this.persist();
    return true;
  }

  async remove(id: string): Promise<void> {
    await this.load();
    this.tasks.delete(id);
    await this.persist();
  }
}

export const taskQueue = new TaskQueue();