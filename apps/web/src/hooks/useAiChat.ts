import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { EditorHandle, SelectionAnchor } from '../components/Editor'
import { chatWithSelectionStream, type ChatMessage } from '../lib/ai-chat'
import { buildScopePreview, type ScopePreview } from '../lib/ai-check-scope'

export interface AiChatSession {
  text: string
  from: number
  to: number
  fromLine: number
  toLine: number
  preview: ScopePreview
}

export function useAiChat(
  editorRef: RefObject<EditorHandle | null>,
  backendAvailable: boolean,
) {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<AiChatSession | null>(null)
  const [panelAnchor, setPanelAnchor] = useState<SelectionAnchor | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2000)
  }, [])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const closeChat = useCallback(() => {
    cancelStream()
    setOpen(false)
    setSession(null)
    setPanelAnchor(null)
    setMessages([])
    setStreaming(false)
    setStreamingText('')
    setError(null)
  }, [cancelStream])

  const openChat = useCallback((anchor?: SelectionAnchor | null) => {
    if (!backendAvailable) return

    const selection = editorRef.current?.getSelection()
    if (!selection || !selection.text.trim()) {
      window.alert('请先选中要对话的内容')
      return
    }

    cancelStream()
    setPanelAnchor(anchor ?? null)
    setSession({
      text: selection.text,
      from: selection.from,
      to: selection.to,
      fromLine: selection.fromLine,
      toLine: selection.toLine,
      preview: buildScopePreview(
        selection.text,
        'selection',
        { from: selection.fromLine, to: selection.toLine },
      ),
    })
    setMessages([])
    setStreaming(false)
    setStreamingText('')
    setError(null)
    setOpen(true)
  }, [backendAvailable, cancelStream, editorRef])

  const sendMessage = useCallback(async (content: string) => {
    if (!session || streaming) return

    const trimmed = content.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setStreaming(true)
    setStreamingText('')
    setError(null)

    cancelStream()
    const controller = new AbortController()
    abortRef.current = controller

    await chatWithSelectionStream(
      session.text,
      nextMessages,
      {
        onDelta: (chunk) => {
          setStreamingText((prev) => prev + chunk)
        },
        onDone: (message) => {
          if (controller.signal.aborted) return
          setMessages((prev) => [...prev, { role: 'assistant', content: message }])
          setStreaming(false)
          setStreamingText('')
          abortRef.current = null
        },
        onError: (message) => {
          if (controller.signal.aborted) return
          setError(message)
          setStreaming(false)
          setStreamingText('')
          abortRef.current = null
        },
      },
      { signal: controller.signal },
    )
  }, [cancelStream, messages, session, streaming])

  const replaceSelection = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor || !session) return false

    editor.replaceRange(session.from, session.to, text)
    showToast('已替换选区')
    return true
  }, [editorRef, session, showToast])

  const insertAtSelection = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor || !session) return false

    editor.replaceRange(session.to, session.to, text)
    showToast('已插入到选区后')
    return true
  }, [editorRef, session, showToast])

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('已复制')
    } catch {
      showToast('复制失败')
    }
  }, [showToast])

  return {
    open,
    session,
    panelAnchor,
    messages,
    streaming,
    streamingText,
    error,
    toast,
    backendAvailable,
    openChat,
    closeChat,
    sendMessage,
    replaceSelection,
    insertAtSelection,
    copyText,
  }
}
