import { useEffect } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="ai-modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="ai-modal confirm-dialog"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <header className="ai-modal-header">
          <h2 id="confirm-dialog-title">{title}</h2>
          <button type="button" className="ai-modal-close" onClick={onCancel} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="ai-modal-body">
          <p id="confirm-dialog-message" className="confirm-dialog-message">{message}</p>
        </div>
        <footer className="ai-modal-footer">
          <button type="button" onClick={onCancel}>{cancelLabel}</button>
          <button
            type="button"
            className={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
