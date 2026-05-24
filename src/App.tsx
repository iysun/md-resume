import { useCallback, useEffect, useState } from 'react'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { Toolbar } from './components/Toolbar'
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
  const previewMarkdown = useDebouncedValue(content, 300)

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

  if (!ready) {
    return (
      <div className="app app-loading">
        加载中…
      </div>
    )
  }

  return (
    <div className="app">
      <Toolbar content={content} onImport={handleImport} onReset={handleReset} />
      <div className="app-main">
        <section className="pane pane-editor">
          <div className="pane-header">
            <span className="pane-header-dot" aria-hidden="true" />
            Markdown 编辑
          </div>
          <Editor value={content} onChange={setContent} />
        </section>
        <section className="pane pane-preview">
          <div className="pane-header">
            <span className="pane-header-dot" aria-hidden="true" />
            实时预览
          </div>
          <Preview markdown={previewMarkdown} />
        </section>
      </div>
    </div>
  )
}
