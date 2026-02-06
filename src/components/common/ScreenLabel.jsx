export function ScreenLabel({ children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/80 backdrop-blur">
      {children}
    </div>
  )
}

