import { useCallback, useState, type RefObject } from 'react'
import type { EditorHandle, EditorSelection } from '../components/Editor'
import { checkMarkdown, type AiCheckResult, type AiCheckScope } from '../lib/ai-check'
import { buildScopePreview, type ScopePreview } from '../lib/ai-check-scope'

export type AiCheckModalPhase = 'confirm' | 'loading' | 'result' | 'error'

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
) {
  const [hasSelection, setHasSelection] = useState(false)
  const [selectionCharCount, setSelectionCharCount] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [phase, setPhase] = useState<AiCheckModalPhase>('confirm')
  const [session, setSession] = useState<AiCheckSession | null>(null)
  const [result, setResult] = useState<AiCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

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
      setPhase('confirm')
      setModalOpen(true)
    },
    [backendAvailable, resolveCheckTarget],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setPhase('confirm')
    setError(null)
  }, [])

  const runCheck = useCallback(async () => {
    if (!session) return
    setPhase('loading')
    setError(null)
    try {
      const checkResult = await checkMarkdown(session.text, session.scope)
      setResult(checkResult)
      setPhase('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查失败')
      setPhase('error')
    }
  }, [session])

  const retryCheck = useCallback(() => {
    setPhase('confirm')
    setError(null)
    setResult(null)
  }, [])

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
    phase,
    session,
    result,
    error,
    appliedKeys,
    toast,
    aiButtonLabel,
    backendAvailable,
    handleSelectionChange,
    openCheck,
    closeModal,
    runCheck,
    retryCheck,
    copyItem,
    applyItem,
  }
}
