import { useEffect, useState } from 'react';
import type { PlatformAdapter } from '@/platform/base';

interface OptimizeButtonProps {
  anchor: HTMLElement | null;
  adapter: PlatformAdapter;
  onClick: () => void;
  disabled?: boolean;
}

const BUTTON_SIZE = 36;
const GAP_FROM_SHELL = 10;

export function OptimizeButton({
  anchor,
  adapter,
  onClick,
  disabled = false
}: OptimizeButtonProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchor) {
      setPos(null);
      return;
    }

    const update = () => {
      const inputRect = anchor.getBoundingClientRect();
      const sendBtn = adapter.findSendButton(anchor);
      const shell = adapter.findInputShell(anchor);
      const shellRect = shell.getBoundingClientRect();

      // 垂直：与发送按钮中心对齐；若无发送按钮，与输入框中心对齐
      const refRect = sendBtn ? sendBtn.getBoundingClientRect() : inputRect;
      const top = refRect.top + (refRect.height - BUTTON_SIZE) / 2;

      // 水平：外壳右侧外部
      const left = shellRect.right + GAP_FROM_SHELL;

      // 若右侧超出视口，改到外壳左侧
      const viewportRight = window.innerWidth;
      if (left + BUTTON_SIZE > viewportRight - 4) {
        setPos({
          top,
          left: shellRect.left - BUTTON_SIZE - GAP_FROM_SHELL
        });
        return;
      }

      setPos({ top, left });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(anchor);

    // 发送按钮可能异步出现，用 MutationObserver 追踪
    const mo = new MutationObserver(update);
    mo.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchor, adapter]);

  if (!pos) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="优化提示词"
      style={{
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${BUTTON_SIZE}px`,
        height: `${BUTTON_SIZE}px`,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        lineHeight: 1,
        color: '#fff',
        background: disabled ? '#94a3b8' : '#3b82f6',
        border: 'none',
        borderRadius: '50%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transition: 'background 0.15s, transform 0.1s',
        zIndex: 2147483647
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {disabled ? '⏳' : '✨'}
    </button>
  );
}