export default function AppTopbar({ title, subtitle, brandName, logoUrl, onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-20 mb-4 rounded-3xl border border-white/10 bg-[var(--surface-card)]/90 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur md:px-5 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/10 text-[var(--text-primary)] md:hidden"
          aria-label="فتح القائمة"
        >
          <span className="text-xl">☰</span>
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-[var(--text-primary)] md:text-xl">{title}</h1>
          {subtitle ? <p className="mt-1 truncate text-xs text-[var(--text-secondary)] md:text-sm">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">الهوية الحالية</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">{brandName || 'المنصة'}</p>
          </div>
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/15 bg-black/20">
            {logoUrl ? <img src={logoUrl} alt="الشعار" className="h-full w-full object-cover" loading="lazy" /> : <span>🟡</span>}
          </div>
        </div>
      </div>
    </header>
  )
}
