import { useEffect } from 'react'
import type { AiCheckItem } from '../lib/ai-check'
import type { AiCheckModalPhase, AiCheckSession } from '../hooks/useAiCheck'
import type { AiCheckResult } from '../lib/ai-check'

interface AiCheckModalProps {
  open: boolean
  phase: AiCheckModalPhase
  session: AiCheckSession | null
  result: AiCheckResult | null
  error: string | null
  appliedKeys: Set<string>
  onClose: () => void
  onConfirm: () => void
  onRetry: () => void
  onCopy: (text: string) => void
  onApply: (itemKey: string, original: string, suggestion: string) => void
}

const CATEGORY_LABELS: Record<AiCheckItem['category'], string> = {
  error: '错误',
  warning: '格式',
  suggestion: '建议',
  good: '亮点',
}

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
  phase,
  session,
  result,
  error,
  appliedKeys,
  onClose,
  onConfirm,
  onRetry,
  onCopy,
  onApply,
}: AiCheckModalProps) {
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
  const title = `AI 检查 · ${scopeLabel}`

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

        <div className="ai-modal-body">
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

          {phase === 'loading' && (
            <div className="ai-modal-loading">
              <div className="ai-modal-spinner" aria-hidden="true" />
              <p>AI 正在分析{scopeLabel}内容…</p>
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
        </div>

        <footer className="ai-modal-footer">
          {phase === 'confirm' && (
            <>
              <button type="button" onClick={onClose}>取消</button>
              <button type="button" className="primary" onClick={onConfirm}>开始检查</button>
            </>
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
        </footer>
      </div>
    </div>
  )
}
