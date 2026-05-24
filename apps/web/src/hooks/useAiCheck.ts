import { useCallback, useState, type RefObject } from 'react'
import type { EditorHandle, EditorSelection } from '../components/Editor'
import { deleteAiCheck, getAiCheck, listAiChecks } from '../lib/api/ai-checks'
import type { AiCheckDetail, AiCheckSummary } from '../lib/api/types'
import { checkMarkdown, type AiCheckResult, type AiCheckScope } from '../lib/ai-check'
import { buildScopePreview, type ScopePreview } from '../lib/ai-check-scope'

export type AiCheckModalPhase = 'confirm' | 'loading' | 'result' | 'error'
export type AiCheckModalTab = 'check' | 'history'

export interface AiCheckSession {
  text: string
  scope: AiCheckScope
  selection: EditorSelection | null
  preview: ScopePreview
}

export function useAiCheck(
  content: string,
  editorRef: RefObject<EditorHandle | null>,
  backendAvailable: boolean,
  documentId: string | null,
) {
  const [hasSelection, setHasSelection] = useState(false)
  const [selectionCharCount, setSelectionCharCount] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<AiCheckModalTab>('check')
  const [phase, setPhase] = useState<AiCheckModalPhase>('confirm')
  const [session, setSession] = useState<AiCheckSession | null>(null)
  const [result, setResult] = useState<AiCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [history, setHistory] = useState<AiCheckSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<AiCheckDetail | null>(null)

  const refreshHistory = useCallback(async () => {
    if (!documentId || !backendAvailable) {
      setHistory([])
      return
    }
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const rows = await listAiChecks(documentId)
      setHistory(rows)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : '加载历史失败')
    } finally {
      setHistoryLoading(false)
    }
  }, [backendAvailable, documentId])

  const handleTabChange = useCallback(
    (tab: AiCheckModalTab) => {
      setModalTab(tab)
      if (tab === 'history') {
        void refreshHistory()
      }
    },
    [refreshHistory],
  )

  const handleSelectionChange = useCallback((selected: boolean, charCount: number) => {
    setHasSelection(selected)
    setSelectionCharCount(charCount)
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2000)
  }, [])

  const resolveCheckTarget = useCallback(
    (forceScope?: AiCheckScope): AiCheckSession | null => {
      const selection = editorRef.current?.getSelection() ?? null
      const scope: AiCheckScope = forceScope ?? (selection ? 'selection' : 'document')
      const text = scope === 'selection' ? selection?.text ?? '' : content

      if (!text.trim()) {
        window.alert(scope === 'selection' ? '请先选中要检查的内容' : '文档内容为空')
        return null
      }

      const preview = buildScopePreview(
        text,
        scope,
        scope === 'selection' && selection
          ? { from: selection.fromLine, to: selection.toLine }
          : null,
      )

      return { text, scope, selection, preview }
    },
    [content, editorRef],
  )

  const openCheck = useCallback(
    (forceScope?: AiCheckScope) => {
      if (!backendAvailable) return
      const nextSession = resolveCheckTarget(forceScope)
      if (!nextSession) return
      setSession(nextSession)
      setResult(null)
      setError(null)
      setAppliedKeys(new Set())
      setSelectedHistory(null)
      setPhase('confirm')
      setModalTab('check')
      setModalOpen(true)
    },
    [backendAvailable, resolveCheckTarget],
  )

  const openHistory = useCallback(() => {
    if (!backendAvailable || !documentId) return
    setSession({
      text: content,
      scope: 'document',
      selection: null,
      preview: buildScopePreview(content, 'document', null),
    })
    setModalTab('history')
    setModalOpen(true)
    void refreshHistory()
  }, [backendAvailable, content, documentId, refreshHistory])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setPhase('confirm')
    setError(null)
    setSelectedHistory(null)
  }, [])

  const runCheck = useCallback(async () => {
    if (!session) return
    setPhase('loading')
    setError(null)
    try {
      const checkResult = await checkMarkdown(
        session.text,
        session.scope,
        documentId ?? undefined,
      )
      setResult(checkResult)
      setPhase('result')
      void refreshHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查失败')
      setPhase('error')
    }
  }, [documentId, refreshHistory, session])

  const retryCheck = useCallback(() => {
    setPhase('confirm')
    setError(null)
    setResult(null)
    setModalTab('check')
  }, [])

  const loadHistoryDetail = useCallback(async (id: string) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const detail = await getAiCheck(id)
      setSelectedHistory(detail)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : '加载详情失败')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const removeHistoryItem = useCallback(
    async (id: string) => {
      try {
        await deleteAiCheck(id)
        setHistory((prev) => prev.filter((item) => item.id !== id))
        if (selectedHistory?.id === id) {
          setSelectedHistory(null)
        }
        showToast('已删除')
      } catch {
        showToast('删除失败')
      }
    },
    [selectedHistory, showToast],
  )

  const copyItem = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        showToast('已复制')
      } catch {
        showToast('复制失败')
      }
    },
    [showToast],
  )

  const applyItem = useCallback(
    (itemKey: string, original: string, suggestion: string) => {
      const editor = editorRef.current
      if (!editor || !session) return false

      const replaced = session.scope === 'selection' && session.selection
        ? editor.replaceInDocument(
            original,
            suggestion,
            session.selection.from,
            session.selection.to,
          )
        : editor.replaceInDocument(original, suggestion)

      if (replaced) {
        setAppliedKeys((prev) => new Set(prev).add(itemKey))
        showToast('已应用替换')
      } else {
        showToast('未找到对应原文，请手动修改')
      }
      return replaced
    },
    [editorRef, session, showToast],
  )

  const aiButtonLabel = hasSelection
    ? `AI 检查选区 (${selectionCharCount} 字)`
    : 'AI 检查全文'

  return {
    hasSelection,
    selectionCharCount,
    modalOpen,
    modalTab,
    setModalTab: handleTabChange,
    phase,
    session,
    result,
    error,
    appliedKeys,
    toast,
    history,
    historyLoading,
    historyError,
    selectedHistory,
    setSelectedHistory,
    aiButtonLabel,
    backendAvailable,
    handleSelectionChange,
    openCheck,
    openHistory,
    closeModal,
    runCheck,
    retryCheck,
    loadHistoryDetail,
    removeHistoryItem,
    refreshHistory,
    copyItem,
    applyItem,
  }
}
