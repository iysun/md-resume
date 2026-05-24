import resumeCss from '../styles/resume.css?inline'

type PdfMode = 'client' | 'server'

function getPdfMode(): PdfMode {
  return import.meta.env.VITE_PDF_MODE === 'server' ? 'server' : 'client'
}

const PRINT_FONT_LINKS = `
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet" />
`

export function buildPrintDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${PRINT_FONT_LINKS}
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

export function printResume(bodyHtml: string): void {
  const html = buildPrintDocument(bodyHtml)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', '打印预览')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  if (!frameWindow) {
    iframe.remove()
    return
  }

  const doc = frameWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 500)
  }

  frameWindow.onafterprint = cleanup

  const triggerPrint = () => {
    // 等待 Web 字体加载后再弹出打印对话框
    setTimeout(() => {
      frameWindow.focus()
      frameWindow.print()
    }, 300)
  }

  if (doc.readyState === 'complete') {
    triggerPrint()
  } else {
    frameWindow.addEventListener('load', triggerPrint, { once: true })
  }
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

  printResume(bodyHtml)
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
