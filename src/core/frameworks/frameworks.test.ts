import { describe, it, expect } from 'vitest';
import { FRAMEWORKS, detectFrameworkFromText, getFrameworksByScene } from './index';

describe('Framework Registry', () => {
  it('包含 8 个框架', () => {
    expect(FRAMEWORKS).toHaveLength(8);
  });

  it('每个框架都有 template 与 slots', () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.template.length).toBeGreaterThan(0);
      expect(fw.slots.length).toBeGreaterThan(0);
      for (const slot of fw.slots) {
        expect(slot.systemPrompt.length).toBeGreaterThan(0);
        expect(slot.fewShotExamples.length).toBeGreaterThan(0);
      }
    }
  });

  it('可检测显式指定的框架', () => {
    expect(detectFrameworkFromText('用 CO-STAR 框架优化')?.id).toBe('co-star');
    expect(detectFrameworkFromText('请按 crispe 格式写')?.id).toBe('crispe');
    expect(detectFrameworkFromText('随便写点东西')).toBeUndefined();
  });

  it('可按场景返回框架', () => {
    const writing = getFrameworksByScene('writing');
    expect(writing.map((f) => f.id)).toContain('co-star');
  });
});