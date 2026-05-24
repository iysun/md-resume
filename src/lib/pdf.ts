import resumeCss from '../styles/resume.css?inline'

export function buildPrintDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${resumeCss}</style>
</head>
<body>
  <article class="resume">${bodyHtml}</article>
</body>
</html>`
}

export async function exportPdf(bodyHtml: string, filename = 'resume.pdf'): Promise<void> {
  const html = buildPrintDocument(bodyHtml)

  const response = await fetch('/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `导出失败 (${response.status})`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadMarkdown(content: string, filename = 'resume.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
