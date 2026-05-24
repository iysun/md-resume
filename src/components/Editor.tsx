import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { useMemo } from 'react'

interface EditorProps {
  value: string
  onChange: (value: string) => void
}

export function Editor({ value, onChange }: EditorProps) {
  const extensions = useMemo(() => [markdown()], [])
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={extensions}
      theme={isDark ? oneDark : 'light'}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
      }}
    />
  )
}
