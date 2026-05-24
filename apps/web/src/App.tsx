import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from './components/Editor'
import type { SelectionAnchor } from './components/Editor'
import { Preview } from './components/Preview'
import { Toolbar } from './components/Toolbar'
import { AiCheckModal } from './components/AiCheckModal'
import { AiChatPanel } from './components/AiChatPanel'
import { SelectionAiToolbar } from './components/SelectionAiToolbar'
import { useAiCheck } from './hooks/useAiCheck'
import { useAiChat } from './hooks/useAiChat'
import { useDocuments } from './hooks/useDocuments'
import { useSettings } from './hooks/useSettings'
import { checkApiHealth } from './lib/api-health'
import type { ThemeSetting } from './lib/api/types'
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
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionAnchor | null>(null)
  const editorRef = useRef<import('./components/Editor').EditorHandle>(null)

  const docs = useDocuments({ backendAvailable })
  const settings = useSettings(backendAvailable)
  const previewMarkdown = useDebouncedValue(docs.content, 300)

  const ai = useAiCheck(
    docs.content,
    editorRef,
    backendAvailable,
    docs.activeDocumentId,
  )

  const aiChat = useAiChat(editorRef, backendAvailable)

  useEffect(() => {
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
  }, [])

  const handleOpenAiCheckSelection = useCallback(() => {
    ai.openCheckAndRun('selection')
  }, [ai])

  const handleOpenAiTalk = useCallback(() => {
    aiChat.openChat(selectionAnchor)
  }, [aiChat, selectionAnchor])

  const handleDeleteDocument = useCallback(async () => {
    if (!docs.activeDocumentId) return
    const current = docs.documents.find((item) => item.id === docs.activeDocumentId)
    if (!window.confirm(`确定删除「${current?.title ?? '当前文档'}」？`)) return
    await docs.removeDocument(docs.activeDocumentId)
  }, [docs])

  if (!backendAvailable || !docs.ready || !settings.ready) {
    const loading = backendAvailable && (!docs.ready || !settings.ready)
    return (
      <div className="app app-loading">
        {loading ? '加载中…' : '后端未连接，请配置 DEEPSEEK_API_KEY 后运行 pnpm dev'}
      </div>
    )
  }

  return (
    <div className="app">
      {(docs.saveError || !backendAvailable) && (
        <div className="backend-banner" role="status">
          {docs.saveError
            ? '更改未能保存到服务端，请检查后端连接。'
            : '后端未连接，AI 检查不可用。请在项目根目录 .env 中配置 DEEPSEEK_API_KEY 后运行 pnpm dev。'}
        </div>
      )}
      <Toolbar
        content={docs.content}
        documents={docs.documents}
        activeDocumentId={docs.activeDocumentId}
        theme={settings.theme}
        loadingDocument={docs.loadingDocument}
        onImport={docs.importContent}
        onReset={docs.resetToTemplate}
        onCreateDocument={docs.createNewDocument}
        onDeleteDocument={handleDeleteDocument}
        onSwitchDocument={docs.switchDocument}
        onThemeChange={(theme: ThemeSetting) => void settings.changeTheme(theme)}
        aiChecking={ai.phase === 'loading' || ai.phase === 'streaming'}
        aiAvailable={ai.backendAvailable}
        onAiCheck={() => ai.openCheckAndRun('document')}
        onAiHistory={() => ai.openHistory()}
      />
      <div className="app-main">
        <section className="pane pane-editor">
          <div className="pane-header">
            <span className="pane-header-dot" aria-hidden="true" />
            Markdown 编辑
          </div>
          <Editor
            ref={editorRef}
            value={docs.content}
            onChange={docs.setContent}
            theme={settings.theme}
            onSelectionAnchorChange={setSelectionAnchor}
            onRequestAiCheck={handleOpenAiCheckSelection}
            onRequestAiTalk={handleOpenAiTalk}
          />
          <SelectionAiToolbar
            anchor={ai.modalOpen || aiChat.open ? null : selectionAnchor}
            disabled={!ai.backendAvailable}
            onCheck={handleOpenAiCheckSelection}
            onTalk={handleOpenAiTalk}
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
        tab={ai.modalTab}
        onTabChange={ai.setModalTab}
        phase={ai.phase}
        session={ai.session}
        result={ai.result}
        streamText={ai.streamText}
        error={ai.error}
        appliedKeys={ai.appliedKeys}
        history={ai.history}
        historyLoading={ai.historyLoading}
        historyError={ai.historyError}
        selectedHistory={ai.selectedHistory}
        onClose={ai.closeModal}
        onConfirm={ai.runCheck}
        onRetry={ai.retryCheck}
        onCopy={ai.copyItem}
        onApply={ai.applyItem}
        onSelectHistory={ai.loadHistoryDetail}
        onBackHistory={() => ai.setSelectedHistory(null)}
        onDeleteHistory={ai.removeHistoryItem}
      />
      <AiChatPanel
        open={aiChat.open}
        session={aiChat.session}
        messages={aiChat.messages}
        streaming={aiChat.streaming}
        streamingText={aiChat.streamingText}
        error={aiChat.error}
        anchor={aiChat.panelAnchor}
        onClose={aiChat.closeChat}
        onSend={aiChat.sendMessage}
        onReplace={aiChat.replaceSelection}
        onInsert={aiChat.insertAtSelection}
        onCopy={aiChat.copyText}
      />
      {(ai.toast || aiChat.toast) && (
        <div className="app-toast" role="status">
          {ai.toast ?? aiChat.toast}
        </div>
      )}
    </div>
  )
}
