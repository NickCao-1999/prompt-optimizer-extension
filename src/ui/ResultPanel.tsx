import { useEffect, useState } from 'react';

export interface RecommendedFrameworkUI {
  id: string;
  name: string;
  matchScore: number;
  reason: string;
}

export interface SlotProgressUI {
  slotId: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
}

export interface UIPanelState {
  phase:
    | 'idle'
    | 'analyzing'
    | 'analysis_done'
    | 'framework_selected'
    | 'generating'
    | 'done'
    | 'failed';
  taskId?: string;
  scene?: string;
  sceneName?: string;
  ambiguityScore?: number;
  ambiguityLevel?: string;
  usedRulesOnly?: boolean;
  frameworkId?: string;
  frameworkName?: string;
  recommendedFrameworks?: RecommendedFrameworkUI[];
  totalSlots?: number;
  completedSlots?: number;
  currentSlot?: string;
  slotStatus?: Record<string, 'pending' | 'generating' | 'done' | 'failed'>;
  finalPrompt?: string;
  error?: string;
}

interface ResultPanelProps {
  state: UIPanelState;
  onClose: () => void;
  onSelectFramework: (frameworkId: string) => void;
  onReplace: (text: string) => void;
}

export function ResultPanel({
  state,
  onClose,
  onSelectFramework,
  onReplace
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const handleCopy = async () => {
    if (state.finalPrompt) {
      await navigator.clipboard.writeText(state.finalPrompt);
      setCopied(true);
    }
  };

  const progress =
    state.totalSlots && state.totalSlots > 0
      ? Math.round(((state.completedSlots ?? 0) / state.totalSlots) * 100)
      : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '420px',
        maxHeight: '80vh',
        overflow: 'auto',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '13px',
        color: '#1e293b',
        zIndex: 2147483647
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <strong style={{ fontSize: '14px' }}>提示词优化</strong>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#64748b',
            padding: '0 4px'
          }}
        >
          ×
        </button>
      </div>

      {/* 内容 */}
      <div style={{ padding: '16px' }}>
        {state.phase === 'analyzing' && (
          <div style={{ color: '#64748b' }}>🔍 正在分析提示词...</div>
        )}

        {(state.phase === 'analysis_done' ||
          state.phase === 'framework_selected' ||
          state.phase === 'generating' ||
          state.phase === 'done') && (
          <>
            {/* 分析结果 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#64748b', marginBottom: '4px' }}>
                场景：{state.sceneName ?? state.scene ?? '未知'}
              </div>
              <div style={{ color: '#64748b' }}>
                模糊度：{state.ambiguityScore ?? '—'}/100
                {state.ambiguityLevel && `（${levelName(state.ambiguityLevel)}）`}
              </div>
            </div>

            {/* 框架推荐 */}
            {state.recommendedFrameworks &&
              state.recommendedFrameworks.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      color: '#475569',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}
                  >
                    推荐框架
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {state.recommendedFrameworks.map((fw) => (
                      <button
                        key={fw.id}
                        onClick={() => onSelectFramework(fw.id)}
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background:
                            fw.id === state.frameworkId ? '#eff6ff' : '#fff',
                          color:
                            fw.id === state.frameworkId ? '#2563eb' : '#334155',
                          cursor: 'pointer'
                        }}
                        title={fw.reason}
                      >
                        {fw.name}（{Math.round(fw.matchScore * 100)}%）
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* 生成进度 */}
            {(state.phase === 'generating' || state.phase === 'done') &&
              state.totalSlots && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      color: '#475569'
                    }}
                  >
                    <span>
                      {state.phase === 'done'
                        ? '✅ 生成完成'
                        : `⏳ 正在生成 ${state.currentSlot ?? ''}`}
                    </span>
                    <span>
                      {state.completedSlots ?? 0}/{state.totalSlots}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      background: '#e2e8f0',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: '#3b82f6',
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                </div>
              )}

            {/* 结果 */}
            {state.phase === 'done' && state.finalPrompt && (
              <div>
                <div
                  style={{
                    color: '#475569',
                    fontWeight: 600,
                    marginBottom: '6px'
                  }}
                >
                  优化后的提示词
                </div>
                <pre
                  style={{
                    background: '#f8fafc',
                    padding: '10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '240px',
                    overflow: 'auto',
                    margin: 0,
                    fontFamily: 'inherit'
                  }}
                >
                  {state.finalPrompt}
                </pre>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => onReplace(state.finalPrompt!)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    一键替换
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      background: '#fff',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {copied ? '✓ 已复制' : '复制'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {state.phase === 'failed' && (
          <div style={{ color: '#dc2626' }}>
            生成失败：{state.error ?? '未知错误'}
          </div>
        )}
      </div>
    </div>
  );
}

function levelName(level: string): string {
  const map: Record<string, string> = {
    clear: '清晰',
    mostly_clear: '基本清晰',
    ambiguous: '模糊',
    very_ambiguous: '高度模糊'
  };
  return map[level] ?? level;
}