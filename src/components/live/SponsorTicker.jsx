import { memo, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

const BASE_ITEM_WIDTH = 240

function SponsorTickerBase({ sponsorUrls = [], speed = 90, pauseOnHover = false, className = '' }) {
  const reduceMotion = useReducedMotion()
  const cleanUrls = useMemo(
    () => sponsorUrls.map((url) => String(url || '').trim()).filter(Boolean),
    [sponsorUrls],
  )

  if (!cleanUrls.length) return null

  const loopItems = [...cleanUrls, ...cleanUrls]
  const loopWidth = cleanUrls.length * BASE_ITEM_WIDTH
  const duration = Math.max(10, loopWidth / Math.max(20, Number(speed) || 90))

  return (
    <section
      className={[
        'relative overflow-hidden rounded-2xl border border-white/10 bg-black/30',
        className,
      ].join(' ')}
      style={{ height: 'clamp(36px, 4vw, 64px)' }}
      aria-label="شريط الرعاة"
    >
      <div
        className={[
          'flex h-full w-max items-center',
          pauseOnHover ? 'hover:[animation-play-state:paused]' : '',
        ].join(' ')}
        style={{
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          animation: reduceMotion ? 'none' : `sponsorTicker ${duration}s linear infinite`,
        }}
      >
        {loopItems.map((url, index) => (
          <div key={`${url}-${index}`} className="grid h-full w-[240px] flex-none place-items-center px-4">
            <img
              src={url}
              alt="Sponsor"
              width={220}
              height={56}
              loading="lazy"
              decoding="async"
              className="h-full max-h-[56px] w-auto object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export const SponsorTicker = memo(SponsorTickerBase)
