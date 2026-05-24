import { useMemo } from 'react'
import { markdownToHtml } from '../lib/markdown'
import '../styles/resume.css'

interface PreviewProps {
  markdown: string
}

export function Preview({ markdown }: PreviewProps) {
  const html = useMemo(() => markdownToHtml(markdown), [markdown])

  return (
    <div className="preview-scroll">
      <div className="preview-paper">
        <article
          className="resume"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}

export function getPreviewHtml(markdown: string): string {
  return markdownToHtml(markdown)
}
