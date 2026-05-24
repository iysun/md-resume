import { useEffect, useRef, useState } from 'react'
import type { DocumentSummary, ThemeSetting } from '../lib/api/types'
import type { SaveStatus } from '../hooks/useDocuments'
import { markdownToHtml } from '../lib/markdown'
import { exportPdf, downloadMarkdown, printResume } from '../lib/pdf'

interface ToolbarProps {
  content: string
  documents: DocumentSummary[]
  activeDocumentId: string | null
  theme: ThemeSetting
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  onRetrySave: () => void
  loadingDocument: boolean
  isOffline: boolean
  onImport: (text: string) => void
  onCreateDocument: () => void
  onDeleteDocument: () => void
  onSwitchDocument: (id: string) => void
  onCycleTheme: () => void
  aiChecking: boolean
  aiAvailable: boolean
  onAiCheck: () => void
  onAiHistory: () => void
  onConfirmReset: () => void
}

const THEME_LABELS: Record<ThemeSetting, string> = {
  system: '系统主题',
  light: '浅色主题',
  dark: '深色主题',
}

function formatSavedTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function SaveStatusIndicator({
  status,
  lastSavedAt,
  onRetry,
}: {
  status: SaveStatus
  lastSavedAt: Date | null
  onRetry: () => void
}) {
  if (status === 'saving') {
    return <span className="save-status save-status-saving">保存中…</span>
  }
  if (status === 'saved' && lastSavedAt) {
    return (
      <span className="save-status save-status-saved">
        已保存 · {formatSavedTime(lastSavedAt)}
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="save-status save-status-error">
        保存失败
        <button type="button" onClick={onRetry}>重试</button>
      </span>
    )
  }
  return null
}

export function Toolbar({
  content,
  documents,
  activeDocumentId,
  theme,
  saveStatus,
  lastSavedAt,
  onRetrySave,
  loadingDocument,
  isOffline,
  onImport,
  onCreateDocument,
  onDeleteDocument,
  onSwitchDocument,
  onCycleTheme,
  aiChecking,
  aiAvailable,
  onAiCheck,
  onAiHistory,
  onConfirmReset,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (!moreOpen) return
    function handleClick(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [moreOpen])

  async function handleExportPdf() {
    setExporting(true)
    try {
      const bodyHtml = markdownToHtml(content)
      await exportPdf(bodyHtml)
    } finally {
      setExporting(false)
    }
  }

  function handlePrint() {
    printResume(markdownToHtml(content))
    setMoreOpen(false)
  }

  function handleExportMd() {
    downloadMarkdown(content)
    setMoreOpen(false)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
    setMoreOpen(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      if (typeof text === 'string') {
        onImport(text)
      }
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  return (
    <header className="toolbar">
      <div className="toolbar-group toolbar-group-brand">
        <div className="toolbar-brand">
          <div className="toolbar-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <div className="toolbar-brand-text">
            <span className="toolbar-title">MD 简历编辑器</span>
            <SaveStatusIndicator
              status={saveStatus}
              lastSavedAt={lastSavedAt}
              onRetry={onRetrySave}
            />
          </div>
        </div>
      </div>

      <div className="toolbar-group toolbar-group-docs">
        <div className="toolbar-documents">
          <label className="toolbar-doc-label" htmlFor="document-select">文档</label>
          <select
            id="document-select"
            className="toolbar-doc-select"
            value={activeDocumentId ?? ''}
            disabled={loadingDocument || isOffline}
            onChange={(event) => onSwitchDocument(event.target.value)}
          >
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
          </select>
          {!isOffline && (
            <>
              <button type="button" disabled={loadingDocument} onClick={onCreateDocument}>
                新建
              </button>
              <button
                type="button"
                className="danger"
                disabled={loadingDocument || documents.length <= 1}
                onClick={onDeleteDocument}
              >
                删除
              </button>
            </>
          )}
        </div>
      </div>

      <div className="toolbar-group toolbar-group-actions">
        <div className="toolbar-actions toolbar-actions-ai">
          <button
            type="button"
            className="ai-check"
            onClick={onAiCheck}
            disabled={!aiAvailable || aiChecking}
            title={aiAvailable ? undefined : '后端未连接，AI 检查不可用'}
          >
            {aiChecking ? '检查中…' : '检查全文'}
          </button>
          <button
            type="button"
            className="ai-secondary"
            onClick={onAiHistory}
            disabled={!aiAvailable}
          >
            AI 历史
          </button>
        </div>

        <div className="toolbar-divider" aria-hidden="true" />

        <div className="toolbar-actions">
          <button type="button" className="primary" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? '导出中…' : '导出 PDF'}
          </button>
        </div>

        <div className="toolbar-divider" aria-hidden="true" />

        <button
          type="button"
          className="toolbar-theme-toggle"
          onClick={onCycleTheme}
          aria-label={THEME_LABELS[theme]}
          title={THEME_LABELS[theme]}
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
        </button>

        <div className="toolbar-menu" ref={moreMenuRef}>
          <button
            type="button"
            className="toolbar-menu-trigger"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((open) => !open)}
          >
            更多
          </button>
          {moreOpen && (
            <div className="toolbar-menu-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={handlePrint}>浏览器打印</button>
              <button type="button" role="menuitem" onClick={handleExportMd}>导出 MD</button>
              <button type="button" role="menuitem" onClick={handleImportClick}>导入 MD</button>
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => {
                  setMoreOpen(false)
                  onConfirmReset()
                }}
              >
                恢复模板
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        onChange={handleFileChange}
        hidden
      />
    </header>
  )
}
