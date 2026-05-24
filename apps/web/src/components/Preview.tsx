import { useMemo } from 'react'
import { markdownToHtml } from '../lib/markdown'
import '../styles/resume.css'

interface PreviewProps {
  markdown: string
  syncing?: boolean
}

export function Preview({ markdown, syncing = false }: PreviewProps) {
  const html = useMemo(() => markdownToHtml(markdown), [markdown])

  return (
    <div className="preview-scroll">
      <div className={`preview-paper${syncing ? ' preview-paper-syncing' : ''}`}>
        <article
          className="resume"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
