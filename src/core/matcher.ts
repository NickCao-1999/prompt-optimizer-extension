import type { Framework, Scene, RecommendedFramework } from '@/shared/types';
import { getFramework, getFrameworksByScene } from './frameworks';

export function matchFrameworks(
  scene: Scene,
  _prompt: string
): RecommendedFramework[] {
  const candidates: Framework[] = [];

  for (const id of scene.recommendedFrameworks) {
    const fw = getFramework(id);
    if (fw) candidates.push(fw);
  }

  const sceneFrameworks = getFrameworksByScene(scene.id);
  for (const fw of sceneFrameworks) {
    if (!candidates.find((c) => c.id === fw.id)) {
      candidates.push(fw);
    }
  }

  return candidates.slice(0, 3).map((fw, index) => ({
    framework: fw,
    matchScore: Math.max(0.6, 0.95 - index * 0.1),
    reason: buildReason(fw, scene)
  }));
}

function buildReason(fw: Framework, scene: Scene): string {
  const slotNames = fw.slots.map((s) => s.name).join('、');
  return `适用于「${scene.name}」场景，包含 ${fw.slots.length} 个要素：${slotNames}`;
}