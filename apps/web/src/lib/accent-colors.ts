export type AccentColor = 'purple' | 'teal' | 'pink' | 'blue' | 'orange'

export const ACCENT_COLORS: AccentColor[] = [
  'purple',
  'teal',
  'pink',
  'blue',
  'orange',
]

export const ACCENT_SWATCHES: Record<
  AccentColor,
  { label: string; color: string }
> = {
  purple: { label: '紫色', color: '#8b5cf6' },
  teal: { label: '青色', color: '#2dd4bf' },
  pink: { label: '粉色', color: '#f472b6' },
  blue: { label: '蓝色', color: '#60a5fa' },
  orange: { label: '橙色', color: '#fb923c' },
}

export const DEFAULT_ACCENT: AccentColor = 'purple'

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && ACCENT_COLORS.includes(value as AccentColor)
}

export function applyAccentColor(accent: AccentColor): void {
  document.documentElement.dataset.accent = accent
}
