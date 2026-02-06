import { motion } from 'framer-motion'
import { useTournamentStore } from '../../store/tournamentStore'

export function OpeningScreen() {
  const name = useTournamentStore((s) => s.tournament.name)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-12 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="text-sm text-white/60">الافتتاح</div>
        <div className="mt-3 text-5xl font-semibold leading-tight tracking-wide">{name}</div>
        <div className="mt-4 max-w-3xl text-lg text-white/75">
          نظام بث سينمائي بأسلوب الرياضات الإلكترونية • يعمل بدون خادم • مزامنة فورية • جاهز للعمل دون إنترنت بعد أول
          تحميل
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4">
          <Stat label="اللغة" value="العربية" />
          <Stat label="الوضع" value="جاهز دون إنترنت" />
          <Stat label="المزامنة" value="مزامنة بين التبويبات" />
        </div>
      </motion.div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-2 text-xl font-semibold text-[#f6d365]">{value}</div>
    </div>
  )
}
