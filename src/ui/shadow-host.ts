import { createRoot, type Root } from 'react-dom/client';
import { type ReactNode } from 'react';

let host: HTMLElement | null = null;
let root: Root | null = null;

export function mountShadowUI(node: ReactNode): void {
  if (root) {
    root.render(node);
    return;
  }

  host = document.createElement('div');
  host.id = 'prompt-optimizer-host';
  host.style.cssText =
    'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  container.id = 'prompt-optimizer-root';
  shadow.appendChild(container);

  root = createRoot(container);
  root.render(node);
}

export function unmountShadowUI(): void {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}