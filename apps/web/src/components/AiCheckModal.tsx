import { useEffect, useState } from 'react'
import type { AiCheckItem } from '../lib/ai-check'
import type { AiCheckModalPhase, AiCheckModalTab, AiCheckSession } from '../hooks/useAiCheck'
import type { AiCheckDetail, AiCheckSummary } from '../lib/api/types'
import type { AiCheckResult } from '../lib/ai-check'
import { AiCheckHistory } from './AiCheckHistory'

interface AiCheckModalProps {
  open: boolean
  tab: AiCheckModalTab
  onTabChange: (tab: AiCheckModalTab) => void
  phase: AiCheckModalPhase
  session: AiCheckSession | null
  result: AiCheckResult | null
  streamText: string
  error: string | null
  appliedKeys: Set<string>
  history: AiCheckSummary[]
  historyLoading: boolean
  historyError: string | null
  selectedHistory: AiCheckDetail | null
  onClose: () => void
  onConfirm: () => void
  onRetry: () => void
  onCopy: (text: string) => void
  onApply: (itemKey: string, original: string, suggestion: string) => void
  onSelectHistory: (id: string) => void
  onBackHistory: () => void
  onDeleteHistory: (id: string) => void
}

const CATEGORY_LABELS: Record<AiCheckItem['category'], string> = {
  error: '✕ 错误',
  warning: '⚠ 格式',
  suggestion: '💡 建议',
  good: '✓ 亮点',
}

const STREAMING_STEPS = [
  '正在阅读简历内容…',
  '正在分析工作经历…',
  '正在检查格式与排版…',
  '正在整理改进建议…',
]

const CATEGORY_ORDER: AiCheckItem['category'][] = ['error', 'warning', 'suggestion', 'good']

function groupItems(items: AiCheckItem[]) {
  const groups = new Map<AiCheckItem['category'], AiCheckItem[]>()
  for (const category of CATEGORY_ORDER) {
    groups.set(category, [])
  }
  for (const item of items) {
    groups.get(item.category)?.push(item)
  }
  return CATEGORY_ORDER
    .map((category) => ({ category, items: groups.get(category) ?? [] }))
    .filter((group) => group.items.length > 0)
}

export function AiCheckModal({
  open,
  tab,
  onTabChange,
  phase,
  session,
  result,
  streamText,
  error,
  appliedKeys,
  history,
  historyLoading,
  historyError,
  selectedHistory,
  onClose,
  onConfirm,
  onRetry,
  onCopy,
  onApply,
  onSelectHistory,
  onBackHistory,
  onDeleteHistory,
}: AiCheckModalProps) {
  const [streamingStep, setStreamingStep] = useState(0)

  useEffect(() => {
    if (phase !== 'streaming' && phase !== 'loading') return
    const timer = window.setInterval(() => {
      setStreamingStep((step) => (step + 1) % STREAMING_STEPS.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !session) return null

  const scopeLabel = session.scope === 'selection' ? '选区' : '全文'
  const title = tab === 'history' ? 'AI 检查 · 历史记录' : `AI 检查 · ${scopeLabel}`

  return (
    <div className="ai-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="ai-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
      >
        <header className="ai-modal-header">
          <h2 id="ai-modal-title">{title}</h2>
          <button type="button" className="ai-modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="ai-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            id="ai-tab-check"
            aria-selected={tab === 'check'}
            aria-controls="ai-tabpanel-check"
            className={tab === 'check' ? 'active' : undefined}
            onClick={() => onTabChange('check')}
          >
            当前检查
          </button>
          <button
            type="button"
            role="tab"
            id="ai-tab-history"
            aria-selected={tab === 'history'}
            aria-controls="ai-tabpanel-history"
            className={tab === 'history' ? 'active' : undefined}
            onClick={() => onTabChange('history')}
          >
            历史记录
          </button>
        </div>

        <div
          className="ai-modal-body"
          id={tab === 'history' ? 'ai-tabpanel-history' : 'ai-tabpanel-check'}
          role="tabpanel"
          aria-labelledby={tab === 'history' ? 'ai-tab-history' : 'ai-tab-check'}
        >
          {tab === 'history' ? (
            <AiCheckHistory
              history={history}
              loading={historyLoading}
              error={historyError}
              selected={selectedHistory}
              onSelect={onSelectHistory}
              onBack={onBackHistory}
              onDelete={onDeleteHistory}
              onCopy={onCopy}
            />
          ) : (
            <>
              {phase === 'confirm' && (
                <div className="ai-modal-confirm">
                  <p className="ai-modal-confirm-desc">即将检查以下内容，确认后开始请求 AI。</p>
                  <dl className="ai-modal-meta">
                    <div>
                      <dt>字数</dt>
                      <dd>{session.preview.charCount}</dd>
                    </div>
                    {session.preview.lineRange && (
                      <div>
                        <dt>行号</dt>
                        <dd>
                          {session.preview.lineRange.from}
                          {' '}
                          –
                          {' '}
                          {session.preview.lineRange.to}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <pre className="ai-modal-excerpt">{session.preview.excerpt}</pre>
                </div>
              )}

              {(phase === 'streaming' || phase === 'loading') && (
                <div className="ai-modal-streaming">
                  <div className="ai-modal-spinner" aria-hidden="true" />
                  <p className="ai-modal-streaming-label">
                    {STREAMING_STEPS[streamingStep]}
                  </p>
                  <div className="ai-modal-skeleton" aria-hidden="true">
                    <div className="ai-modal-skeleton-line ai-modal-skeleton-line-wide" />
                    <div className="ai-modal-skeleton-line" />
                    <div className="ai-modal-skeleton-line ai-modal-skeleton-line-medium" />
                    <div className="ai-modal-skeleton-line" />
                    <div className="ai-modal-skeleton-line ai-modal-skeleton-line-short" />
                  </div>
                  {import.meta.env.DEV && streamText && (
                    <pre className="ai-modal-stream ai-modal-stream-dev">{streamText}</pre>
                  )}
                </div>
              )}

              {phase === 'error' && (
                <div className="ai-modal-error">
                  <p>{error ?? '检查失败'}</p>
                </div>
              )}

              {phase === 'result' && result && (
                <div className="ai-modal-result">
                  <p className="ai-modal-summary">{result.summary}</p>
                  {result.items.length === 0 ? (
                    <p className="ai-modal-empty">未发现需要改进的问题。</p>
                  ) : (
                    groupItems(result.items).map(({ category, items }) => (
                      <section key={category} className="ai-modal-group">
                        <h3 className={`ai-modal-group-title ai-cat-${category}`}>
                          {CATEGORY_LABELS[category]}
                        </h3>
                        <ul className="ai-modal-items">
                          {items.map((item, index) => {
                            const itemKey = `${category}-${index}-${item.title}`
                            const canApply = Boolean(item.original && item.suggestion)
                            const applied = appliedKeys.has(itemKey)
                            return (
                              <li key={itemKey} className="ai-modal-item">
                                <div className="ai-modal-item-head">
                                  <strong>{item.title}</strong>
                                  {applied && <span className="ai-modal-applied">已应用</span>}
                                </div>
                                <p className="ai-modal-item-detail">{item.detail}</p>
                                {item.original && (
                                  <div className="ai-modal-diff">
                                    <span className="ai-modal-diff-label">原文</span>
                                    <code>{item.original}</code>
                                  </div>
                                )}
                                {item.suggestion && (
                                  <div className="ai-modal-diff ai-modal-diff-suggestion">
                                    <span className="ai-modal-diff-label">建议</span>
                                    <code>{item.suggestion}</code>
                                  </div>
                                )}
                                <div className="ai-modal-item-actions">
                                  <button
                                    type="button"
                                    onClick={() => onCopy(item.suggestion ?? item.detail)}
                                  >
                                    复制
                                  </button>
                                  {canApply && (
                                    <button
                                      type="button"
                                      className="primary"
                                      disabled={applied}
                                      onClick={() => onApply(itemKey, item.original!, item.suggestion!)}
                                    >
                                      替换
                                    </button>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="ai-modal-footer">
          {tab === 'history' ? (
            <button type="button" className="primary" onClick={onClose}>关闭</button>
          ) : (
            <>
              {phase === 'confirm' && (
                <>
                  <button type="button" onClick={onClose}>取消</button>
                  <button type="button" className="primary" onClick={onConfirm}>开始检查</button>
                </>
              )}
              {phase === 'streaming' && (
                <button type="button" onClick={onClose}>取消</button>
              )}
              {phase === 'loading' && (
                <button type="button" disabled>检查中…</button>
              )}
              {(phase === 'result' || phase === 'error') && (
                <>
                  <button type="button" onClick={onRetry}>重新检查</button>
                  <button type="button" className="primary" onClick={onClose}>关闭</button>
                </>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
