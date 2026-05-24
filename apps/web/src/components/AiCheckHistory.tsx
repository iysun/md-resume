import type { AiCheckDetail, AiCheckSummary } from '../lib/api/types'
import type { AiCheckResult } from '../lib/ai-check'

const SCOPE_LABELS = {
  selection: '选区',
  document: '全文',
} as const

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface AiCheckHistoryProps {
  history: AiCheckSummary[]
  loading: boolean
  error: string | null
  selected: AiCheckDetail | null
  onSelect: (id: string) => void
  onBack: () => void
  onDelete: (id: string) => void
  onCopy: (text: string) => void
}

function HistoryResultView({
  result,
  onCopy,
}: {
  result: AiCheckResult
  onCopy: (text: string) => void
}) {
  return (
    <div className="ai-modal-result">
      <p className="ai-modal-summary">{result.summary}</p>
      {result.items.length === 0 ? (
        <p className="ai-modal-empty">未发现需要改进的问题。</p>
      ) : (
        <ul className="ai-modal-items">
          {result.items.map((item, index) => (
            <li key={`${item.category}-${index}`} className="ai-modal-item">
              <div className="ai-modal-item-head">
                <strong>{item.title}</strong>
              </div>
              <p className="ai-modal-item-detail">{item.detail}</p>
              <div className="ai-modal-item-actions">
                <button
                  type="button"
                  onClick={() => onCopy(item.suggestion ?? item.detail)}
                >
                  复制
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AiCheckHistory({
  history,
  loading,
  error,
  selected,
  onSelect,
  onBack,
  onDelete,
  onCopy,
}: AiCheckHistoryProps) {
  if (loading && history.length === 0 && !selected) {
    return (
      <div className="ai-modal-loading">
        <div className="ai-modal-spinner" aria-hidden="true" />
        <p>加载历史记录…</p>
      </div>
    )
  }

  if (error) {
    return <div className="ai-modal-error"><p>{error}</p></div>
  }

  if (selected) {
    return (
      <div className="ai-history-detail">
        <button type="button" className="ai-history-back" onClick={onBack}>
          ← 返回列表
        </button>
        <dl className="ai-modal-meta">
          <div>
            <dt>范围</dt>
            <dd>{SCOPE_LABELS[selected.scope]}</dd>
          </div>
          <div>
            <dt>时间</dt>
            <dd>{formatTime(selected.createdAt)}</dd>
          </div>
        </dl>
        <pre className="ai-modal-excerpt">{selected.inputPreview}</pre>
        <HistoryResultView result={selected.result} onCopy={onCopy} />
      </div>
    )
  }

  if (history.length === 0) {
    return <p className="ai-modal-empty">暂无 AI 检查历史。</p>
  }

  return (
    <ul className="ai-history-list">
      {history.map((item) => (
        <li key={item.id} className="ai-history-item">
          <button
            type="button"
            className="ai-history-item-main"
            onClick={() => onSelect(item.id)}
          >
            <span className="ai-history-item-scope">{SCOPE_LABELS[item.scope]}</span>
            <span className="ai-history-item-preview">{item.inputPreview}</span>
            <span className="ai-history-item-time">{formatTime(item.createdAt)}</span>
          </button>
          <button
            type="button"
            className="ai-history-item-delete"
            onClick={() => onDelete(item.id)}
            aria-label="删除记录"
          >
            删除
          </button>
        </li>
      ))}
    </ul>
  )
}
