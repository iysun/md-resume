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
import { clearContent, loadContent, loadDefaultTemplate } from '../lib/storage'

interface UseDocumentsOptions {
  backendAvailable: boolean
}

export function useDocuments({ backendAvailable }: UseDocumentsOptions) {
  const [ready, setReady] = useState(false)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const saveTimerRef = useRef<number | null>(null)
  const latestContentRef = useRef(content)
  const activeDocumentIdRef = useRef(activeDocumentId)

  useEffect(() => {
    latestContentRef.current = content
  }, [content])

  useEffect(() => {
    activeDocumentIdRef.current = activeDocumentId
  }, [activeDocumentId])

  const loadActiveDocument = useCallback(async (documentId: string) => {
    const document = await getDocument(documentId)
    setContent(document.content)
    setActiveDocumentId(document.id)
    activeDocumentIdRef.current = document.id
  }, [])

  const refreshDocuments = useCallback(async () => {
    const rows = await listDocuments()
    setDocuments(rows)
    return rows
  }, [])

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
        setSaveError(false)
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
    if (!ready || !activeDocumentId || !backendAvailable) return

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      updateDocument(activeDocumentId, { content: latestContentRef.current })
        .then((document) => {
          setSaveError(false)
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
  }, [content, ready, activeDocumentId, backendAvailable])

  const switchDocument = useCallback(
    async (documentId: string) => {
      if (documentId === activeDocumentIdRef.current) return
      setLoadingDocument(true)
      try {
        if (activeDocumentIdRef.current) {
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
    [loadActiveDocument, refreshDocuments],
  )

  const createNewDocument = useCallback(async () => {
    setLoadingDocument(true)
    try {
      if (activeDocumentIdRef.current) {
        await updateDocument(activeDocumentIdRef.current, {
          content: latestContentRef.current,
        })
      }
      const document = await createDocument()
      await patchSettings({ activeDocumentId: document.id })
      setDocuments(await refreshDocuments())
      setActiveDocumentId(document.id)
      setContent(document.content)
      setSaveError(false)
    } catch {
      setSaveError(true)
    } finally {
      setLoadingDocument(false)
    }
  }, [refreshDocuments])

  const removeDocument = useCallback(
    async (documentId: string) => {
      if (documents.length <= 1) return
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
    [documents.length, loadActiveDocument, refreshDocuments],
  )

  const resetToTemplate = useCallback(async () => {
    if (!activeDocumentIdRef.current) return
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
    loadingDocument,
    switchDocument,
    createNewDocument,
    removeDocument,
    resetToTemplate,
    importContent,
  }
}
