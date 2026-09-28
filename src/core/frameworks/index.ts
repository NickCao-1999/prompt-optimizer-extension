import type { Framework } from '@/shared/types';
import { CO_STAR } from './co-star';
import { CRISPE } from './crispe';
import { RISEN } from './risen';
import { RTF } from './rtf';
import { RACE } from './race';
import { APE } from './ape';
import { TAG } from './tag';
import { REACT } from './react';

export const FRAMEWORKS: Framework[] = [
  CO_STAR, CRISPE, RISEN, RTF, RACE, APE, TAG, REACT
];

export const FRAMEWORK_MAP: Record<string, Framework> = Object.fromEntries(
  FRAMEWORKS.map((f) => [f.id, f])
);

export function getFramework(id: string): Framework | undefined {
  return FRAMEWORK_MAP[id];
}

/**
 * 通过别名 / 用户输入检测显式指定的框架
 */
export function detectFrameworkFromText(text: string): Framework | undefined {
  const lower = text.toLowerCase();
  for (const fw of FRAMEWORKS) {
    if (lower.includes(fw.id.toLowerCase())) return fw;
    if (fw.aliases.some((a) => lower.includes(a.toLowerCase()))) return fw;
    if (lower.includes(fw.name.toLowerCase())) return fw;
  }
  return undefined;
}

export function getFrameworksByScene(sceneId: string): Framework[] {
  return FRAMEWORKS.filter((f) => f.applicableScenes.includes(sceneId as never));
}