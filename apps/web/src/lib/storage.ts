const STORAGE_KEY = 'md-resume:content'

export function loadContent(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearContent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export async function loadDefaultTemplate(): Promise<string> {
  const response = await fetch('/templates/resume.zh-CN.md')
  if (!response.ok) {
    throw new Error('无法加载默认模板')
  }
  return response.text()
}
