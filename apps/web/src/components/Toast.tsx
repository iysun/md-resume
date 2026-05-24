import { useEffect } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
  durationMs?: number
}

export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss, durationMs])

  return (
    <div className="app-toast" role="status">
      <span>{message}</span>
      <button type="button" className="app-toast-close" onClick={onDismiss} aria-label="关闭">
        ×
      </button>
    </div>
  )
}
