export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return false
    const data = await response.json() as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}
