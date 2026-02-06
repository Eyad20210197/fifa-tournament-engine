/*
  زخارف خفيفة (هلال/فوانيس) بدون صور خارجية للحفاظ على العمل بدون شبكة.
*/
export function CornerOrnaments({ variant = 'display' }) {
  const opacity = variant === 'display' ? 1 : 0.65
  return (
    <div className="pointer-events-none absolute inset-0" style={{ opacity }}>
      <Lantern className="absolute right-8 top-10 hidden lg:block" />
      <Lantern className="absolute left-10 top-16 hidden lg:block" flip />
      <Crescent className="absolute bottom-10 right-10 hidden lg:block" />
    </div>
  )
}

function Lantern({ className = '', flip = false }) {
  return (
    <svg
      className={className}
      width="120"
      height="180"
      viewBox="0 0 120 180"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <defs>
        <linearGradient id="lanternGlow" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(246,211,101,0.08)" />
          <stop offset="1" stopColor="rgba(201,162,39,0.18)" />
        </linearGradient>
      </defs>
      <path d="M60 8c10 10 20 12 34 12-8 10-12 18-12 30v80c0 18-14 32-22 40-8-8-22-22-22-40V50c0-12-4-20-12-30 14 0 24-2 34-12z" fill="url(#lanternGlow)" stroke="rgba(246,211,101,0.18)" />
      <path d="M44 52h32v60H44z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
      <path d="M44 82h32" stroke="rgba(246,211,101,0.20)" />
    </svg>
  )
}

function Crescent({ className = '' }) {
  return (
    <svg className={className} width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moon" cx="50%" cy="40%" r="70%">
          <stop offset="0" stopColor="rgba(246,211,101,0.22)" />
          <stop offset="60%" stopColor="rgba(201,162,39,0.16)" />
          <stop offset="100%" stopColor="rgba(201,162,39,0.00)" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r="54" fill="url(#moon)" />
      <path
        d="M90 22c-26 7-44 31-44 59 0 22 12 42 29 53-34-4-60-33-60-69 0-39 32-71 71-71 2 0 3 0 4 0z"
        fill="rgba(246,211,101,0.30)"
      />
    </svg>
  )
}

