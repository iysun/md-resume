import { useRef, useState } from 'react'
import { markdownToHtml } from '../lib/markdown'
import { exportPdf, downloadMarkdown, printResume } from '../lib/pdf'

interface ToolbarProps {
  content: string
  onImport: (text: string) => void
  onReset: () => void
  aiButtonLabel: string
  aiChecking: boolean
  aiAvailable: boolean
  onAiCheck: () => void
}

export function Toolbar({
  content,
  onImport,
  onReset,
  aiButtonLabel,
  aiChecking,
  aiAvailable,
  onAiCheck,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

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
  }

  function handleExportMd() {
    downloadMarkdown(content)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
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

  function handleReset() {
    if (window.confirm('确定恢复默认模板？当前内容将被覆盖。')) {
      onReset()
    }
  }

  return (
    <header className="toolbar">
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
          <span className="toolbar-subtitle">实时预览 · 自动保存</span>
        </div>
      </div>
      <div className="toolbar-actions toolbar-actions-primary">
        <button
          type="button"
          className="ai-check"
          onClick={onAiCheck}
          disabled={!aiAvailable || aiChecking}
          title={aiAvailable ? undefined : '后端未连接，AI 检查不可用'}
        >
          {aiChecking ? '检查中…' : aiButtonLabel}
        </button>
        <button type="button" className="primary" onClick={handleExportPdf} disabled={exporting}>
          {exporting ? '导出中…' : '导出 PDF'}
        </button>
      </div>
      <div className="toolbar-divider" aria-hidden="true" />
      <div className="toolbar-actions">
        <button type="button" onClick={handlePrint}>浏览器打印</button>
        <button type="button" onClick={handleExportMd}>导出 MD</button>
        <button type="button" onClick={handleImportClick}>导入 MD</button>
      </div>
      <div className="toolbar-divider" aria-hidden="true" />
      <div className="toolbar-actions">
        <button type="button" className="danger" onClick={handleReset}>恢复模板</button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        onChange={handleFileChange}
      />
    </header>
  )
}
