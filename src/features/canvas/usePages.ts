import { useState, useCallback } from 'react'
import type { Page, Element } from '../../types/canvas'

function newPage(n: number): Page {
  return { id: crypto.randomUUID(), name: `Page ${n}`, elements: [] }
}

export function usePages() {
  const [pages, setPages] = useState<Page[]>([newPage(1)])
  const [currentId, setCurrentId] = useState(pages[0].id)

  const currentPage = pages.find(p => p.id === currentId) ?? pages[0]

  // Save elements snapshot back into a page
  const savePage = useCallback((id: string, elements: Element[]) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, elements } : p))
  }, [])

  const addPage = useCallback(() => {
    const p = newPage(0) // name fixed below
    setPages(prev => {
      const named = { ...p, name: `Page ${prev.length + 1}` }
      return [...prev, named]
    })
    setCurrentId(p.id)
  }, [])

  const deletePage = useCallback((id: string) => {
    setPages(prev => {
      if (prev.length === 1) return prev
      const next = prev.filter(p => p.id !== id)
      return next
    })
    setCurrentId(prev => {
      if (prev !== id) return prev
      const idx = pages.findIndex(p => p.id === id)
      const fallback = pages[idx + 1] ?? pages[idx - 1]
      return fallback?.id ?? pages[0].id
    })
  }, [pages])

  const renamePage = useCallback((id: string, name: string) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, name } : p))
  }, [])

  return {
    pages,
    currentPage,
    currentId,
    setCurrentId,
    savePage,
    addPage,
    deletePage,
    renamePage,
  }
}