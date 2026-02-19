import { AnimatePresence, motion } from 'framer-motion'

export function GoalCelebration({ open, sideLabel, teamName }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="relative overflow-hidden rounded-3xl border border-[var(--primary-color)]/40 bg-black/55 px-10 py-8 text-center shadow-[0_0_60px_rgba(201,162,39,0.18)] backdrop-blur"
          >
            <div className="absolute inset-0 bg-[radial-gradient(600px_220px_at_50%_20%,rgba(201,162,39,0.25),transparent_60%)]" />
            <div className="relative">
              <div className="text-sm text-white/70">{sideLabel}</div>
              <div className="mt-2 text-6xl font-extrabold tracking-wide text-[var(--secondary-color)]">هدف!</div>
              <div className="mt-3 text-2xl font-semibold text-white/90">{teamName || '—'}</div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
