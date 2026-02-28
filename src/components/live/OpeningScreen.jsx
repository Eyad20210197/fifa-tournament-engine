import { memo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore } from '../../store/tournamentStore'
import { fetchOpeningVideo } from '../../services/mediaService'

export const OpeningScreen = memo(function OpeningScreen({ allowSkip = false, onSkip = null }) {
  const name = useTournamentStore((s) => s.tournament.name)
  const [openingVideo, setOpeningVideo] = useState(null)

  useEffect(() => {
    let active = true
    void fetchOpeningVideo()
      .then((data) => {
        if (active) setOpeningVideo(data?.path ? data : null)
      })
      .catch(() => {
        if (active) setOpeningVideo(null)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="grid h-full overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex h-full min-h-0 flex-col gap-3"
      >
        <p className="shrink-0 text-[clamp(0.9rem,1.1vw,1.2rem)] text-[var(--text-secondary)]">الافتتاح الرسمي</p>
        <h2 className="shrink-0 font-headline text-[clamp(1.5rem,3.4vw,4.2rem)] font-semibold leading-tight">{name || 'بطولة رمضان'}</h2>

        <div className="mx-auto aspect-video w-full max-w-[min(92vw,1280px)] min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
          {openingVideo?.path ? (
            <video
              key={openingVideo.path}
              src={openingVideo.path}
              autoPlay
              muted
              playsInline
              preload="auto"
              controls={allowSkip}
              poster="/icons/icon.svg"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_55%)]">
              <div className="text-center">
                <p className="font-headline text-[clamp(1.1rem,1.9vw,2.2rem)] text-white/85">16:9 Opening Video Placeholder</p>
                <p className="mt-1 text-[clamp(0.8rem,1vw,1.1rem)] text-white/60">Upload MP4 from Brand Identity</p>
              </div>
            </div>
          )}
        </div>

        {allowSkip ? (
          <div className="shrink-0">
            <button
              className="min-h-10 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
              onClick={() => onSkip?.()}
            >
              تخطي شاشة الافتتاح
            </button>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
})
