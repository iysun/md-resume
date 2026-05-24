import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

export interface EditorSelection {
  text: string
  from: number
  to: number
  fromLine: number
  toLine: number
}

export interface SelectionAnchor {
  x: number
  y: number
  charCount: number
}

export interface EditorHandle {
  getSelection: () => EditorSelection | null
  replaceRange: (from: number, to: number, text: string) => void
  replaceInDocument: (
    original: string,
    suggestion: string,
    searchFrom?: number,
    searchTo?: number,
  ) => boolean
}

import type { ThemeSetting } from '../lib/api/types'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  theme?: ThemeSetting
  onSelectionChange?: (hasSelection: boolean, charCount: number) => void
  onSelectionAnchorChange?: (anchor: SelectionAnchor | null) => void
  onRequestAiCheck?: () => void
  onRequestAiTalk?: () => void
}

interface ContextMenuState {
  x: number
  y: number
}

function computeSelectionAnchor(view: EditorView): SelectionAnchor | null {
  const { from, to } = view.state.selection.main
  if (from === to) return null

  const coords = view.coordsAtPos(to)
  if (!coords) return null

  return {
    x: coords.left,
    y: coords.top,
    charCount: to - from,
  }
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    value,
    onChange,
    theme = 'system',
    onSelectionChange,
    onSelectionAnchorChange,
    onRequestAiCheck,
    onRequestAiTalk,
  },
  ref,
) {
  const viewRef = useRef<EditorView | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [resolvedDark, setResolvedDark] = useState(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (theme === 'dark') {
      setResolvedDark(true)
      return
    }
    if (theme === 'light') {
      setResolvedDark(false)
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      setResolvedDark(media.matches)
    }
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  const notifySelection = useCallback(
    (view: EditorView) => {
      const { from, to } = view.state.selection.main
      const hasSelection = from !== to
      onSelectionChange?.(hasSelection, hasSelection ? to - from : 0)
      onSelectionAnchorChange?.(computeSelectionAnchor(view))
    },
    [onSelectionChange, onSelectionAnchorChange],
  )

  const selectionListener = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (!viewRef.current) return
        if (update.selectionSet || update.viewportChanged) {
          notifySelection(update.view)
        }
      }),
    [notifySelection],
  )

  const extensions = useMemo(
    () => [markdown(), selectionListener],
    [selectionListener],
  )

  useImperativeHandle(ref, () => ({
    getSelection() {
      const view = viewRef.current
      if (!view) return null
      const { from, to } = view.state.selection.main
      if (from === to) return null
      const text = view.state.sliceDoc(from, to)
      const fromLine = view.state.doc.lineAt(from).number
      const toLine = view.state.doc.lineAt(to).number
      return { text, from, to, fromLine, toLine }
    },
    replaceRange(from, to, text) {
      const view = viewRef.current
      if (!view) return
      view.dispatch({ changes: { from, to, insert: text } })
      onChange(view.state.doc.toString())
    },
    replaceInDocument(original, suggestion, searchFrom, searchTo) {
      const view = viewRef.current
      if (!view) return false
      const doc = view.state.doc.toString()
      const start = searchFrom ?? 0
      const end = searchTo ?? doc.length
      const slice = doc.slice(start, end)
      const index = slice.indexOf(original)
      if (index === -1) return false
      const from = start + index
      const to = from + original.length
      view.dispatch({ changes: { from, to, insert: suggestion } })
      onChange(view.state.doc.toString())
      return true
    },
  }), [onChange])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !onSelectionAnchorChange) return

    function updateAnchor() {
      if (viewRef.current) {
        onSelectionAnchorChange(computeSelectionAnchor(viewRef.current))
      }
    }

    window.addEventListener('scroll', updateAnchor, true)
    window.addEventListener('resize', updateAnchor)
    return () => {
      window.removeEventListener('scroll', updateAnchor, true)
      window.removeEventListener('resize', updateAnchor)
    }
  }, [onSelectionAnchorChange])

  useEffect(() => {
    if (!contextMenu) return

    function closeMenu() {
      setContextMenu(null)
    }

    window.addEventListener('click', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [contextMenu])

  function handleContextMenu(event: React.MouseEvent) {
    const view = viewRef.current
    if (!view || (!onRequestAiCheck && !onRequestAiTalk)) return
    const { from, to } = view.state.selection.main
    if (from === to) return
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  function handleContextMenuCheck() {
    setContextMenu(null)
    onRequestAiCheck?.()
  }

  function handleContextMenuTalk() {
    setContextMenu(null)
    onRequestAiTalk?.()
  }

  return (
    <div ref={wrapperRef} className="editor-wrapper" onContextMenu={handleContextMenu}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        theme={resolvedDark ? oneDark : 'light'}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view
          notifySelection(view)
        }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
        }}
      />
      {contextMenu && (
        <div
          className="editor-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          {onRequestAiCheck && (
            <button type="button" role="menuitem" onClick={handleContextMenuCheck}>
              AI 检查选区
            </button>
          )}
          {onRequestAiTalk && (
            <button type="button" role="menuitem" onClick={handleContextMenuTalk}>
              与 AI 对话
            </button>
          )}
        </div>
      )}
    </div>
  )
})
