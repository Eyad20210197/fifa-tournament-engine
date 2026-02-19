import { motion } from 'framer-motion'
import { useTournamentStore } from '../../store/tournamentStore'

export function OpeningScreen() {
  const name = useTournamentStore((s) => s.tournament.name)

  return (
    <div className="grid h-full min-h-[64vh] rounded-3xl border border-white/10 bg-black/20 p-[3.2vw] backdrop-blur">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex h-full flex-col justify-center"
      >
        <p className="text-[clamp(1rem,1.3vw,1.5rem)] text-[var(--text-secondary)]">الافتتاح الرسمي</p>
        <h2 className="mt-3 text-[clamp(2rem,5vw,6rem)] font-semibold leading-tight">{name || 'بطولة رمضان'}</h2>
        <p className="mt-5 max-w-[70ch] text-[clamp(1rem,1.5vw,2rem)] text-[var(--text-secondary)]">
          نظام عرض حي مخصص للبطولات، واضح من مسافات بعيدة، سريع الاستجابة، ومهيأ للشاشات الكبيرة.
        </p>
      </motion.div>
    </div>
  )
}
