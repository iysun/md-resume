interface SelectionAiToolbarProps {
  top: number
  charCount: number
  onCheck: () => void
  onTalk: () => void
}

export function SelectionAiToolbar({ top, charCount, onCheck, onTalk }: SelectionAiToolbarProps) {
  return (
    <div
      className="selection-ai-toolbar"
      style={{ top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button type="button" onClick={onCheck}>
        检查 ({charCount} 字)
      </button>
      <span className="selection-ai-toolbar-divider" aria-hidden="true" />
      <button type="button" onClick={onTalk}>
        与 AI 对话
      </button>
    </div>
  )
}
