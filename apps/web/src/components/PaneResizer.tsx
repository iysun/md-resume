import { useCallback, useRef } from 'react'

interface PaneResizerProps {
  onResize: (ratio: number) => void
}

export function PaneResizer({ onResize }: PaneResizerProps) {
  const draggingRef = useRef(false)

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)

      function handlePointerMove(moveEvent: PointerEvent) {
        if (!draggingRef.current) return
        const main = document.querySelector('.app-main')
        if (!main) return
        const rect = main.getBoundingClientRect()
        const ratio = (moveEvent.clientX - rect.left) / rect.width
        onResize(Math.min(0.7, Math.max(0.3, ratio)))
      }

      function handlePointerUp() {
        draggingRef.current = false
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    },
    [onResize],
  )

  return (
    <div
      className="pane-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="调整编辑区与预览区宽度"
      onPointerDown={handlePointerDown}
    />
  )
}
