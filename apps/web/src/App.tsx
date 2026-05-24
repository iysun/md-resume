import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { Toolbar } from './components/Toolbar'
import { AiCheckModal } from './components/AiCheckModal'
import { useAiCheck } from './hooks/useAiCheck'
import { checkApiHealth } from './lib/api-health'
import { loadContent, saveContent, clearContent, loadDefaultTemplate } from './lib/storage'
import './styles/app.css'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export default function App() {
  const [content, setContent] = useState('')
  const [ready, setReady] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const editorRef = useRef<import('./components/Editor').EditorHandle>(null)
  const previewMarkdown = useDebouncedValue(content, 300)

  const ai = useAiCheck(content, editorRef, backendAvailable)

  useEffect(() => {
    async function init() {
      const saved = loadContent()
      if (saved !== null) {
        setContent(saved)
      } else {
        try {
          const template = await loadDefaultTemplate()
          setContent(template)
        } catch {
          setContent('# 简历\n\n在此编写你的简历…')
        }
      }
      setReady(true)
    }
    init()
  }, [])

  useEffect(() => {
    if (!ready) return
    let cancelled = false

    async function pollHealth() {
      const ok = await checkApiHealth()
      if (!cancelled) setBackendAvailable(ok)
    }

    pollHealth()
    const timer = window.setInterval(pollHealth, 15000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [ready])

  useEffect(() => {
    if (ready) {
      saveContent(content)
    }
  }, [content, ready])

  const handleImport = useCallback((text: string) => {
    setContent(text)
  }, [])

  const handleReset = useCallback(async () => {
    clearContent()
    try {
      const template = await loadDefaultTemplate()
      setContent(template)
    } catch {
      setContent('# 简历\n\n在此编写你的简历…')
    }
  }, [])

  const handleOpenAiCheckSelection = useCallback(() => {
    ai.openCheck('selection')
  }, [ai])

  if (!ready) {
    return (
      <div className="app app-loading">
        加载中…
      </div>
    )
  }

  return (
    <div className="app">
      {!backendAvailable && (
        <div className="backend-banner" role="status">
          后端未连接，AI 检查不可用。请使用
          {' '}
          <code>DEEPSEEK_API_KEY=sk-xxx pnpm dev</code>
          {' '}
          启动 API 服务。
        </div>
      )}
      <Toolbar
        content={content}
        onImport={handleImport}
        onReset={handleReset}
        aiButtonLabel={ai.aiButtonLabel}
        aiChecking={ai.phase === 'loading'}
        aiAvailable={ai.backendAvailable}
        onAiCheck={() => ai.openCheck()}
      />
      <div className="app-main">
        <section className="pane pane-editor">
          <div className="pane-header">
            <span className="pane-header-dot" aria-hidden="true" />
            Markdown 编辑
          </div>
          <Editor
            ref={editorRef}
            value={content}
            onChange={setContent}
            onSelectionChange={ai.handleSelectionChange}
            onRequestAiCheck={handleOpenAiCheckSelection}
          />
        </section>
        <section className="pane pane-preview">
          <div className="pane-header">
            <span className="pane-header-dot" aria-hidden="true" />
            实时预览
          </div>
          <Preview markdown={previewMarkdown} />
        </section>
      </div>
      <AiCheckModal
        open={ai.modalOpen}
        phase={ai.phase}
        session={ai.session}
        result={ai.result}
        error={ai.error}
        appliedKeys={ai.appliedKeys}
        onClose={ai.closeModal}
        onConfirm={ai.runCheck}
        onRetry={ai.retryCheck}
        onCopy={ai.copyItem}
        onApply={ai.applyItem}
      />
      {ai.toast && <div className="app-toast" role="status">{ai.toast}</div>}
    </div>
  )
}
