import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SelectionAnchor } from './Editor'
import type { AiChatSession } from '../hooks/useAiChat'
import type { ChatMessage } from '../lib/ai-chat'

interface AiChatPanelProps {
  open: boolean
  session: AiChatSession | null
  messages: ChatMessage[]
  streaming: boolean
  streamingText: string
  error: string | null
  anchor: SelectionAnchor | null
  onClose: () => void
  onSend: (content: string) => void
  onReplace: (text: string) => void
  onInsert: (text: string) => void
  onCopy: (text: string) => void
}

const PANEL_WIDTH = 380
const PANEL_MAX_HEIGHT = 480
const VIEWPORT_MARGIN = 12
const MOBILE_BREAKPOINT = 768

function useIsMobileDrawer() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    function handleChange() {
      setIsMobile(media.matches)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

function computePanelPosition(
  anchor: SelectionAnchor,
  panelWidth: number,
  panelHeight: number,
): { left: number; top: number } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = anchor.x + 8
  let top = anchor.y + 8

  if (left + panelWidth + VIEWPORT_MARGIN > viewportWidth) {
    left = anchor.x - panelWidth - 8
  }
  if (left < VIEWPORT_MARGIN) {
    left = VIEWPORT_MARGIN
  }

  if (top + panelHeight + VIEWPORT_MARGIN > viewportHeight) {
    top = anchor.y - panelHeight - 8
  }
  if (top < VIEWPORT_MARGIN) {
    top = VIEWPORT_MARGIN
  }

  return { left, top }
}

export function AiChatPanel({
  open,
  session,
  messages,
  streaming,
  streamingText,
  error,
  anchor,
  onClose,
  onSend,
  onReplace,
  onInsert,
  onCopy,
}: AiChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const isMobileDrawer = useIsMobileDrawer()

  const handleClose = useCallback(() => {
    setInput('')
    onClose()
  }, [onClose])

  useLayoutEffect(() => {
    if (!open || !anchor || !panelRef.current || isMobileDrawer) {
      setPosition(null)
      return
    }

    function updatePosition() {
      if (!anchor || !panelRef.current) return
      const rect = panelRef.current.getBoundingClientRect()
      setPosition(computePanelPosition(anchor, rect.width || PANEL_WIDTH, rect.height || PANEL_MAX_HEIGHT))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchor, open, messages.length, streaming, streamingText, isMobileDrawer])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handleClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  useEffect(() => {
    if (!messagesRef.current) return
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, streamingText])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  if (!open || !session) return null

  function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed || streaming) return
    setInput('')
    onSend(trimmed)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const style = isMobileDrawer
    ? undefined
    : position
      ? { left: position.left, top: position.top, width: PANEL_WIDTH }
      : { left: anchor?.x ?? 0, top: anchor?.y ?? 0, width: PANEL_WIDTH, visibility: 'hidden' as const }

  return (
    <>
      {isMobileDrawer && <div className="ai-chat-backdrop" onClick={handleClose} aria-hidden="true" />}
      <div
        ref={panelRef}
        className={`ai-chat-panel${isMobileDrawer ? ' ai-chat-panel-drawer' : ''}`}
        style={style}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="与 AI 对话"
      >
        <header className="ai-chat-header">
          <h3>与 AI 对话</h3>
          <button type="button" className="ai-chat-close" onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="ai-chat-context">
          <dl className="ai-chat-meta">
            <div>
              <dt>字数</dt>
              <dd>{session.preview.charCount}</dd>
            </div>
            {session.preview.lineRange && (
              <div>
                <dt>行号</dt>
                <dd>
                  {session.preview.lineRange.from}
                  {' '}
                  –
                  {' '}
                  {session.preview.lineRange.to}
                </dd>
              </div>
            )}
          </dl>
          <pre className="ai-chat-excerpt">{session.preview.excerpt}</pre>
        </div>

        <div ref={messagesRef} className="ai-chat-messages">
          {messages.length === 0 && !streaming && (
            <p className="ai-chat-empty">围绕选区内容提问，例如「帮我润色这段」</p>
          )}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`ai-chat-bubble ai-chat-bubble-${message.role}`}
            >
              <div className="ai-chat-bubble-content">{message.content}</div>
              {message.role === 'assistant' && (
                <div className="ai-chat-actions">
                  <button type="button" onClick={() => onReplace(message.content)}>替换选区</button>
                  <button type="button" onClick={() => onInsert(message.content)}>插入到选区后</button>
                  <button type="button" onClick={() => onCopy(message.content)}>复制</button>
                </div>
              )}
            </div>
          ))}

          {streaming && (
            <div className="ai-chat-bubble ai-chat-bubble-assistant">
              <div className="ai-chat-bubble-content">
                {streamingText}
                <span className="ai-chat-cursor" aria-hidden="true" />
              </div>
            </div>
          )}

          {error && <p className="ai-chat-error">{error}</p>}
        </div>

        <footer className="ai-chat-input-area">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            value={input}
            placeholder="输入问题…"
            rows={2}
            disabled={streaming}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="ai-chat-send primary"
            disabled={streaming || !input.trim()}
            onClick={handleSubmit}
          >
            发送
          </button>
        </footer>
      </div>
    </>
  )
}
