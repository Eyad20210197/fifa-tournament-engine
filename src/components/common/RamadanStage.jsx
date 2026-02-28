import { Starfield } from './Starfield'
import { CornerOrnaments } from './CornerOrnaments'

export function RamadanStage({ children, variant = 'control' }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Starfield intensity={variant === 'display' ? 1 : 0.8} />
      <CornerOrnaments variant={variant} />
      <GlowOrnament />
      <div className="relative">{children}</div>
    </div>
  )
}

function GlowOrnament() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-[-120px] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#c9a227]/10 blur-2xl" />
      <div className="absolute bottom-[-160px] right-[-160px] h-[520px] w-[520px] rounded-full bg-[#2d8cff]/10 blur-2xl" />
      <div className="absolute left-[-180px] top-[30%] h-[520px] w-[520px] rounded-full bg-[#f6d365]/10 blur-2xl" />

      {/* هلال بسيط */}
      <div className="absolute left-10 top-10 h-24 w-24 rounded-full border border-[#f6d365]/40 shadow-[0_0_30px_rgba(246,211,101,0.18)]" />
      <div className="absolute left-16 top-12 h-20 w-20 rounded-full bg-[#07162b]" />
    </div>
  )
}
