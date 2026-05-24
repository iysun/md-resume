export interface SelectionAnchor {
  x: number
  y: number
  charCount: number
}

interface SelectionAiToolbarProps {
  anchor: SelectionAnchor | null
  disabled?: boolean
  onCheck: () => void
  onTalk: () => void
}

export function SelectionAiToolbar({ anchor, disabled, onCheck, onTalk }: SelectionAiToolbarProps) {
  if (!anchor || disabled) return null

  return (
    <div
      className="selection-ai-toolbar"
      style={{
        left: anchor.x,
        top: anchor.y,
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button type="button" onClick={onCheck}>
        检查 ({anchor.charCount} 字)
      </button>
      <span className="selection-ai-toolbar-divider" aria-hidden="true" />
      <button type="button" onClick={onTalk}>
        与 AI 对话
      </button>
    </div>
  )
}
