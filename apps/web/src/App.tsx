import { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from './components/Editor'
import type { SelectionAnchor } from './components/Editor'
import { Preview } from './components/Preview'
import { Toolbar } from './components/Toolbar'
import { AiCheckModal } from './components/AiCheckModal'
import { AiChatPanel } from './components/AiChatPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { PaneResizer } from './components/PaneResizer'
import { MarkdownHelp } from './components/MarkdownHelp'
import { Toast } from './components/Toast'
import { useAiCheck } from './hooks/useAiCheck'
import { useAiChat } from './hooks/useAiChat'
import { useDocuments } from './hooks/useDocuments'
import { useSettings } from './hooks/useSettings'
import { checkApiHealth } from './lib/api-health'
import './styles/app.css'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

function useIsCompactLayout() {
  const [compact, setCompact] = useState(
    () => window.matchMedia('(max-width: 1024px)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)')
    function handleChange() {
      setCompact(media.matches)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return compact
}

type ConfirmState =
  | { type: 'delete'; title: string }
  | { type: 'reset' }
  | null

export default function App() {
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [backendChecked, setBackendChecked] = useState(false)
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionAnchor | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const editorRef = useRef<import('./components/Editor').EditorHandle>(null)

  const docs = useDocuments({ backendAvailable })
  const settings = useSettings(backendAvailable)
  const previewMarkdown = useDebouncedValue(docs.content, 300)
  const previewSyncing = docs.content !== previewMarkdown
  const isCompactLayout = useIsCompactLayout()

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
      if (!cancelled) {
        setBackendAvailable(ok)
        setBackendChecked(true)
      }
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

  const handleDeleteDocument = useCallback(() => {
    if (!docs.activeDocumentId) return
    const current = docs.documents.find((item) => item.id === docs.activeDocumentId)
    setConfirmState({
      type: 'delete',
      title: current?.title ?? '当前文档',
    })
  }, [docs.activeDocumentId, docs.documents])

  const handleConfirmDelete = useCallback(async () => {
    if (!docs.activeDocumentId) return
    await docs.removeDocument(docs.activeDocumentId)
    setConfirmState(null)
  }, [docs])

  const handleConfirmReset = useCallback(async () => {
    await docs.resetToTemplate()
    setConfirmState(null)
    setToastMessage('已恢复默认模板')
  }, [docs])

  const showInitialLoading = backendChecked && backendAvailable && (!docs.ready || !settings.ready)

  if (!backendChecked || showInitialLoading) {
    return (
      <div className="app app-loading">
        <div className="app-loading-card">
          <div className="toolbar-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <p>{showInitialLoading ? '加载中…' : '正在连接…'}</p>
        </div>
      </div>
    )
  }

  if (backendAvailable && !docs.ready) {
    return (
      <div className="app app-loading">
        <div className="app-loading-card">
          <p>无法加载文档，请检查后端连接。</p>
        </div>
      </div>
    )
  }

  if (!docs.ready) {
    return (
      <div className="app app-loading">
        <div className="app-loading-card">
          <p>加载中…</p>
        </div>
      </div>
    )
  }

  const editorFlex = settings.editorPaneRatio
  const previewFlex = 1 - settings.editorPaneRatio

  return (
    <div className="app">
      {!backendAvailable && (
        <div className="backend-banner" role="status">
          离线模式：内容保存在本地浏览器。AI 检查与云同步不可用，请运行 <code>pnpm dev</code> 并配置 <code>DEEPSEEK_API_KEY</code>。
        </div>
      )}
      {backendAvailable && docs.saveError && (
        <div className="backend-banner backend-banner-error" role="status">
          更改未能保存到服务端，请检查后端连接。
        </div>
      )}

      <Toolbar
        content={docs.content}
        documents={docs.documents}
        activeDocumentId={docs.activeDocumentId}
        theme={settings.theme}
        saveStatus={docs.saveStatus}
        lastSavedAt={docs.lastSavedAt}
        onRetrySave={docs.retrySave}
        loadingDocument={docs.loadingDocument}
        isOffline={docs.isOffline}
        onImport={docs.importContent}
        onCreateDocument={docs.createNewDocument}
        onDeleteDocument={handleDeleteDocument}
        onSwitchDocument={docs.switchDocument}
        onCycleTheme={settings.cycleTheme}
        aiChecking={ai.phase === 'loading' || ai.phase === 'streaming'}
        aiAvailable={ai.backendAvailable}
        onAiCheck={() => ai.openCheckAndRun('document')}
        onAiHistory={() => ai.openHistory()}
        onConfirmReset={() => setConfirmState({ type: 'reset' })}
      />

      {isCompactLayout && (
        <div className="mobile-pane-tabs" role="tablist" aria-label="编辑与预览">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'editor'}
            className={mobileTab === 'editor' ? 'active' : undefined}
            onClick={() => setMobileTab('editor')}
          >
            编辑
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'preview'}
            className={mobileTab === 'preview' ? 'active' : undefined}
            onClick={() => setMobileTab('preview')}
          >
            预览
          </button>
        </div>
      )}

      <div className={`app-main${isCompactLayout ? ' app-main-compact' : ''}`}>
        <section
          className={`pane pane-editor${isCompactLayout && mobileTab !== 'editor' ? ' pane-hidden' : ''}`}
          style={isCompactLayout ? undefined : { flex: editorFlex }}
        >
          <div className="pane-header">
            <span className="pane-header-dot" aria-hidden="true" />
            <span className="pane-header-title">Markdown 编辑</span>
            <MarkdownHelp compact />
          </div>
          {!docs.content.trim() && <MarkdownHelp />}
          <Editor
            ref={editorRef}
            value={docs.content}
            onChange={docs.setContent}
            theme={settings.theme}
            onSelectionAnchorChange={setSelectionAnchor}
            onRequestAiCheck={handleOpenAiCheckSelection}
            onRequestAiTalk={handleOpenAiTalk}
            aiToolbarHidden={ai.modalOpen || aiChat.open}
            aiToolbarDisabled={!ai.backendAvailable}
          />
        </section>

        {!isCompactLayout && (
          <PaneResizer onResize={settings.changeEditorPaneRatio} />
        )}

        <section
          className={`pane pane-preview${isCompactLayout && mobileTab !== 'preview' ? ' pane-hidden' : ''}${previewSyncing ? ' pane-preview-syncing' : ''}`}
          style={isCompactLayout ? undefined : { flex: previewFlex }}
        >
          <div className="pane-header">
            <span className="pane-header-dot" aria-hidden="true" />
            <span className="pane-header-title">实时预览</span>
            <span
              className={`sync-indicator${previewSyncing ? ' sync-indicator-pending' : ' sync-indicator-synced'}`}
              role="status"
              aria-live="polite"
            >
              {previewSyncing ? '同步中…' : '已同步'}
            </span>
          </div>
          <Preview markdown={previewMarkdown} syncing={previewSyncing} />
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

      <ConfirmDialog
        open={confirmState?.type === 'delete'}
        title="删除文档"
        message={`确定删除「${confirmState?.type === 'delete' ? confirmState.title : ''}」？此操作不可撤销。`}
        confirmLabel="删除"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setConfirmState(null)}
      />

      <ConfirmDialog
        open={confirmState?.type === 'reset'}
        title="恢复默认模板"
        message="确定恢复默认模板？当前内容将被覆盖且无法撤销。"
        confirmLabel="恢复"
        variant="danger"
        onConfirm={() => void handleConfirmReset()}
        onCancel={() => setConfirmState(null)}
      />

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  )
}
