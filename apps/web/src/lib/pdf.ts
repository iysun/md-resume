import resumeCss from '../styles/resume.css?inline'

type PdfMode = 'client' | 'server'

function getPdfMode(): PdfMode {
  return import.meta.env.VITE_PDF_MODE === 'server' ? 'server' : 'client'
}

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

async function exportPdfServer(bodyHtml: string, filename = 'resume.pdf'): Promise<void> {
  const html = buildPrintDocument(bodyHtml)
  const apiUrl = import.meta.env.VITE_PDF_API_URL || '/api/export-pdf'

  const response = await fetch(apiUrl, {
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

export function printResume(): void {
  window.print()
}

export async function exportPdf(bodyHtml: string, filename = 'resume.pdf'): Promise<void> {
  if (getPdfMode() === 'server') {
    try {
      await exportPdfServer(bodyHtml, filename)
      return
    } catch {
      // 服务端不可用时静默降级为浏览器打印
    }
  }

  printResume()
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
