import type { PlatformAdapter } from './base';
import {
  readInputGeneric,
  findSendButtonGeneric,
  findInputShellGeneric
} from './base';

export const kimiAdapter: PlatformAdapter = {
  hostname: /kimi\.(com|moonshot\.cn)/,
  name: 'Kimi',
  findInput() {
    const selectors = [
      '.chat-input-editor[contenteditable="true"]',
      '[data-lexical-editor="true"]',
      '.editor-container [contenteditable="true"]',
      '[contenteditable="true"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 20) return el;
      }
    }
    return null;
  },
  readInput: readInputGeneric,
  writeInput(el, text) {
    el.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand('delete', false);
    document.execCommand('insertText', false, text);
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  },
  findAnchor(input) {
    return findInputShellGeneric(input);
  },
  findSendButton(input) {
    return findSendButtonGeneric(input);
  },
  findInputShell(input) {
    return findInputShellGeneric(input);
  }
};