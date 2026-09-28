export interface PlatformAdapter {
  hostname: RegExp;
  name: string;
  findInput(): HTMLElement | null;
  readInput(el: HTMLElement): string;
  writeInput(el: HTMLElement, text: string): void;
  findAnchor(input: HTMLElement): HTMLElement;
  /** 查找发送按钮 */
  findSendButton(input: HTMLElement): HTMLElement | null;
  /** 查找输入框的最外层容器（对话框外壳） */
  findInputShell(input: HTMLElement): HTMLElement;
}

export function readInputGeneric(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement) return el.value;
  return el.innerText ?? el.textContent ?? '';
}

export function writeInputGeneric(el: HTMLElement, text: string): void {
  el.focus();
  if (el instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  selection?.removeAllRanges();
  selection?.addRange(range);
  const ok = document.execCommand('insertText', false, text);
  if (!ok) {
    el.innerText = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

export function findInputGeneric(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    'textarea, [contenteditable="true"]'
  );
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 100 && rect.height > 20 && isVisible(el)) {
      return el;
    }
  }
  return null;
}

/** 通用发送按钮查找：优先 submit，其次尺寸合适的按钮 */
export function findSendButtonGeneric(input: HTMLElement): HTMLElement | null {
  // 1. 从输入框向上找 6 层，在容器内找发送按钮
  let node: HTMLElement | null = input;
  for (let i = 0; i < 6 && node?.parentElement; i++) {
    node = node.parentElement;

    const submit = node.querySelector<HTMLElement>('button[type="submit"]');
    if (submit && isVisible(submit)) return submit;

    const sendLike = node.querySelector<HTMLElement>(
      'button[class*="send" i], [class*="send-button" i], [aria-label*="发送"], [aria-label*="send" i]'
    );
    if (sendLike && isVisible(sendLike)) return sendLike;

    // 兜底：找尺寸 28-60 且位置最右下的 button
    const buttons = Array.from(
      node.querySelectorAll<HTMLElement>('button')
    ).filter((b) => {
      if (!isVisible(b)) return false;
      const r = b.getBoundingClientRect();
      return r.width >= 28 && r.width <= 60 && r.height >= 28 && r.height <= 60;
    });
    if (buttons.length > 0) {
      buttons.sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return rb.right + rb.bottom - (ra.right + ra.bottom);
      });
      return buttons[0];
    }
  }
  return null;
}

/** 通用外壳查找：向上找到明显比输入框宽的容器 */
export function findInputShellGeneric(input: HTMLElement): HTMLElement {
  const inputRect = input.getBoundingClientRect();
  let node: HTMLElement = input;
  for (let i = 0; i < 6 && node.parentElement; i++) {
    const parent: HTMLElement = node.parentElement;
    const rect = parent.getBoundingClientRect();
    if (rect.width >= inputRect.width + 80 && rect.height >= inputRect.height) {
      node = parent;
    } else {
      break;
    }
  }
  return node;
}

export function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}