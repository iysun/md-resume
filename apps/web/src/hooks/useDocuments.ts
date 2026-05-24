import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from '../lib/api/documents'
import { getSettings, patchSettings } from '../lib/api/settings'
import type { DocumentSummary } from '../lib/api/types'
import {
  clearContent,
  deriveTitleFromContent,
  loadContent,
  loadDefaultTemplate,
  saveContent,
} from '../lib/storage'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseDocumentsOptions {
  backendAvailable: boolean
}

const LOCAL_DOC_ID = 'local'

export function useDocuments({ backendAvailable }: UseDocumentsOptions) {
  const [ready, setReady] = useState(false)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [persistedContent, setPersistedContent] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [showSavedIndicator, setShowSavedIndicator] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const saveTimerRef = useRef<number | null>(null)
  const savedFadeTimerRef = useRef<number | null>(null)
  const latestContentRef = useRef(content)
  const activeDocumentIdRef = useRef(activeDocumentId)

  const saveStatus: SaveStatus = saveError
    ? 'error'
    : content !== persistedContent
      ? 'saving'
      : showSavedIndicator
        ? 'saved'
        : 'idle'

  useEffect(() => {
    latestContentRef.current = content
  }, [content])

  useEffect(() => {
    activeDocumentIdRef.current = activeDocumentId
  }, [activeDocumentId])

  const scheduleSavedFade = useCallback(() => {
    if (savedFadeTimerRef.current !== null) {
      window.clearTimeout(savedFadeTimerRef.current)
    }
    setShowSavedIndicator(true)
    savedFadeTimerRef.current = window.setTimeout(() => {
      setShowSavedIndicator(false)
    }, 3000)
  }, [])

  const markPersisted = useCallback((nextContent: string) => {
    setPersistedContent(nextContent)
    setLastSavedAt(new Date())
    scheduleSavedFade()
  }, [scheduleSavedFade])

  const loadActiveDocument = useCallback(async (documentId: string) => {
    const document = await getDocument(documentId)
    setContent(document.content)
    setPersistedContent(document.content)
    setActiveDocumentId(document.id)
    activeDocumentIdRef.current = document.id
    setShowSavedIndicator(false)
    setSaveError(false)
  }, [])

  const refreshDocuments = useCallback(async () => {
    const rows = await listDocuments()
    setDocuments(rows)
    return rows
  }, [])

  useEffect(() => {
    if (backendAvailable) return

    let cancelled = false

    async function initOffline() {
      let initial = loadContent()
      if (!initial?.trim()) {
        try {
          initial = await loadDefaultTemplate()
        } catch {
          initial = '# 简历\n\n在此编写你的简历…'
        }
      }
      if (cancelled) return

      const title = deriveTitleFromContent(initial)
      setDocuments([{ id: LOCAL_DOC_ID, title, updatedAt: Date.now() }])
      setActiveDocumentId(LOCAL_DOC_ID)
      activeDocumentIdRef.current = LOCAL_DOC_ID
      setContent(initial)
      setPersistedContent(initial)
      setSaveError(false)
      setShowSavedIndicator(false)
      setReady(true)
    }

    initOffline()

    return () => {
      cancelled = true
    }
  }, [backendAvailable])

  useEffect(() => {
    if (!backendAvailable) return

    let cancelled = false

    async function init() {
      try {
        const [rows, settings] = await Promise.all([
          listDocuments(),
          getSettings(),
        ])
        if (cancelled) return

        setDocuments(rows)

        let targetId = settings.activeDocumentId
        if (!targetId || !rows.some((row) => row.id === targetId)) {
          targetId = rows[0]?.id ?? null
        }

        if (!targetId) {
          const created = await createDocument()
          if (cancelled) return
          setDocuments([created])
          targetId = created.id
        }

        let document = await getDocument(targetId)
        if (cancelled) return

        const legacyContent = loadContent()
        const shouldMigrate =
          legacyContent !== null &&
          rows.length === 1 &&
          !document.content.trim()

        if (shouldMigrate) {
          document = await updateDocument(targetId, { content: legacyContent })
          clearContent()
        } else if (!document.content.trim()) {
          try {
            const template = await loadDefaultTemplate()
            document = await updateDocument(targetId, { content: template })
          } catch {
            document = await updateDocument(targetId, {
              content: '# 简历\n\n在此编写你的简历…',
            })
          }
        }

        if (cancelled) return

        if (settings.activeDocumentId !== targetId) {
          await patchSettings({ activeDocumentId: targetId })
        }

        setActiveDocumentId(document.id)
        setContent(document.content)
        setPersistedContent(document.content)
        setSaveError(false)
        setShowSavedIndicator(false)
        setReady(true)
      } catch {
        if (!cancelled) {
          setReady(false)
          setSaveError(true)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [backendAvailable])

  useEffect(() => {
    if (!ready || !activeDocumentId) return

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      if (!backendAvailable) {
        saveContent(latestContentRef.current)
        const title = deriveTitleFromContent(latestContentRef.current)
        setDocuments([{ id: LOCAL_DOC_ID, title, updatedAt: Date.now() }])
        setSaveError(false)
        markPersisted(latestContentRef.current)
        return
      }

      updateDocument(activeDocumentId, { content: latestContentRef.current })
        .then((document) => {
          setSaveError(false)
          markPersisted(latestContentRef.current)
          setDocuments((prev) =>
            prev.map((row) =>
              row.id === document.id
                ? {
                    id: document.id,
                    title: document.title,
                    updatedAt: document.updatedAt,
                  }
                : row,
            ),
          )
        })
        .catch(() => {
          setSaveError(true)
        })
    }, 300)

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [content, ready, activeDocumentId, backendAvailable, markPersisted])

  const retrySave = useCallback(() => {
    if (!activeDocumentIdRef.current) return
    if (!backendAvailable) {
      saveContent(latestContentRef.current)
      setSaveError(false)
      markPersisted(latestContentRef.current)
      return
    }
    updateDocument(activeDocumentIdRef.current, { content: latestContentRef.current })
      .then(() => {
        setSaveError(false)
        markPersisted(latestContentRef.current)
      })
      .catch(() => {
        setSaveError(true)
      })
  }, [backendAvailable, markPersisted])

  const switchDocument = useCallback(
    async (documentId: string) => {
      if (documentId === activeDocumentIdRef.current) return
      if (!backendAvailable) return

      setLoadingDocument(true)
      try {
        if (activeDocumentIdRef.current && latestContentRef.current !== persistedContent) {
          await updateDocument(activeDocumentIdRef.current, {
            content: latestContentRef.current,
          })
        }
        await patchSettings({ activeDocumentId: documentId })
        await loadActiveDocument(documentId)
        await refreshDocuments()
        setSaveError(false)
      } catch {
        setSaveError(true)
      } finally {
        setLoadingDocument(false)
      }
    },
    [backendAvailable, loadActiveDocument, persistedContent, refreshDocuments],
  )

  const createNewDocument = useCallback(async () => {
    if (!backendAvailable) return
    setLoadingDocument(true)
    try {
      if (activeDocumentIdRef.current && latestContentRef.current !== persistedContent) {
        await updateDocument(activeDocumentIdRef.current, {
          content: latestContentRef.current,
        })
      }
      const document = await createDocument()
      await patchSettings({ activeDocumentId: document.id })
      setDocuments(await refreshDocuments())
      setActiveDocumentId(document.id)
      setContent(document.content)
      setPersistedContent(document.content)
      setShowSavedIndicator(false)
      setSaveError(false)
    } catch {
      setSaveError(true)
    } finally {
      setLoadingDocument(false)
    }
  }, [backendAvailable, persistedContent, refreshDocuments])

  const removeDocument = useCallback(
    async (documentId: string) => {
      if (!backendAvailable || documents.length <= 1) return
      setLoadingDocument(true)
      try {
        await deleteDocument(documentId)
        const rows = await refreshDocuments()
        const settings = await getSettings()
        const nextId =
          settings.activeDocumentId ??
          rows[0]?.id ??
          null
        if (nextId) {
          await loadActiveDocument(nextId)
        }
        setSaveError(false)
      } catch {
        setSaveError(true)
      } finally {
        setLoadingDocument(false)
      }
    },
    [backendAvailable, documents.length, loadActiveDocument, refreshDocuments],
  )

  const resetToTemplate = useCallback(async () => {
    try {
      const template = await loadDefaultTemplate()
      setContent(template)
      setSaveError(false)
    } catch {
      setContent('# 简历\n\n在此编写你的简历…')
    }
  }, [])

  const importContent = useCallback((text: string) => {
    setContent(text)
  }, [])

  return {
    ready,
    documents,
    activeDocumentId,
    content,
    setContent,
    saveError,
    saveStatus,
    lastSavedAt,
    retrySave,
    loadingDocument,
    switchDocument,
    createNewDocument,
    removeDocument,
    resetToTemplate,
    importContent,
    isOffline: !backendAvailable,
  }
}
