import { useRef, useState } from 'react'
import { exportPdf, downloadMarkdown } from '../lib/pdf'
import { getPreviewHtml } from './Preview'

interface ToolbarProps {
  content: string
  onImport: (text: string) => void
  onReset: () => void
}

export function Toolbar({ content, onImport, onReset }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExportPdf() {
    setExporting(true)
    try {
      const bodyHtml = getPreviewHtml(content)
      await exportPdf(bodyHtml)
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出 PDF 失败'
      alert(message)
    } finally {
      setExporting(false)
    }
  }

  function handlePrint() {
    window.print()
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
      <span className="toolbar-title">MD 简历编辑器</span>
      <button type="button" className="primary" onClick={handleExportPdf} disabled={exporting}>
        {exporting ? '导出中…' : '导出 PDF'}
      </button>
      <button type="button" onClick={handlePrint}>浏览器打印</button>
      <button type="button" onClick={handleExportMd}>导出 MD</button>
      <button type="button" onClick={handleImportClick}>导入 MD</button>
      <button type="button" onClick={handleReset}>恢复模板</button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        onChange={handleFileChange}
      />
    </header>
  )
}
