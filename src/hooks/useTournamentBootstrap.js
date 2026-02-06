import { useEffect, useRef } from 'react'
import { useTournamentStore } from '../store/tournamentStore'

/*
  Bootstrap:
  - استرجاع الحالة من IndexedDB
*/
export function useTournamentBootstrap() {
  const hydrate = useTournamentStore((s) => s.hydrate)
  const onceRef = useRef(false)

  useEffect(() => {
    if (onceRef.current) return
    onceRef.current = true

    let cancelled = false

    ;(async () => {
      await hydrate()
      if (cancelled) return
    })()

    return () => {
      cancelled = true
    }
  }, [hydrate])
}
