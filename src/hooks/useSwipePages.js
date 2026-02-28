import { useCallback, useEffect, useMemo, useState } from 'react'

export function useSwipePages(items = [], pageSize = 8, intervalMs = 10000) {
  const safePageSize = Math.max(1, Number(pageSize) || 1)
  const [pageIndex, setPageIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)

  const pages = useMemo(() => {
    const chunks = []
    for (let i = 0; i < items.length; i += safePageSize) {
      chunks.push(items.slice(i, i + safePageSize))
    }
    return chunks.length ? chunks : [[]]
  }, [items, safePageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [pages.length])

  useEffect(() => {
    if (pages.length <= 1) return undefined
    const id = setInterval(() => {
      setPageIndex((value) => (value + 1) % pages.length)
    }, Math.max(3000, Number(intervalMs) || 10000))
    return () => clearInterval(id)
  }, [intervalMs, pages.length])

  const prevPage = useCallback(() => {
    setPageIndex((value) => (value - 1 + pages.length) % pages.length)
  }, [pages.length])

  const nextPage = useCallback(() => {
    setPageIndex((value) => (value + 1) % pages.length)
  }, [pages.length])

  const onTouchStart = useCallback((event) => {
    setTouchStartX(event.changedTouches?.[0]?.clientX ?? null)
  }, [])

  const onTouchEnd = useCallback(
    (event) => {
      if (touchStartX == null) return
      const endX = event.changedTouches?.[0]?.clientX ?? touchStartX
      const delta = endX - touchStartX
      if (Math.abs(delta) < 45) return
      if (delta > 0) prevPage()
      else nextPage()
    },
    [nextPage, prevPage, touchStartX],
  )

  return {
    pageIndex,
    pages,
    page: pages[pageIndex] || [],
    hasManyPages: pages.length > 1,
    prevPage,
    nextPage,
    swipeHandlers: {
      onTouchStart,
      onTouchEnd,
    },
  }
}
