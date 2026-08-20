import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function StationsPage() {
  const { t, language } = useLanguage()
  const stations = usePrototypeStore((s) => s.stations)
  const toggleStation = usePrototypeStore((s) => s.toggleStation)

  function formatTime(seconds = 0) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const busyCount = stations.filter((s) => s.status === 'busy').length
  const totalHourlyIncome = stations.reduce((acc, s) => acc + (s.status === 'busy' ? s.hourlyRate : 0), 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/40 bg-indigo-500/20 text-indigo-400">
              <AppIcon name="timer" size={22} />
            </div>
            <div>
              <ShinyText text={t('navStations')} className="text-xl font-black text-white" />
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'متابعة عدادات أجهزة البلايستيشن، الجلسات النشطة، وأجور الاستخدام' : 'PlayStation 5 console timers, active sessions, and hourly billing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-mono font-bold text-emerald-300">
              {busyCount} / {stations.length} Active PS5
            </span>
            <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-mono font-bold text-amber-300">
              {totalHourlyIncome} EGP/hr
            </span>
          </div>
        </div>
      </SpotlightCard>

      {/* Stations Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stations.map((st) => {
          const isBusy = st.status === 'busy'
          const isMaintenance = st.status === 'maintenance'

          return (
            <SpotlightCard
              key={st.id}
              className={`border p-5 space-y-4 transition-all ${
                isBusy
                  ? 'border-indigo-500/40 bg-slate-950/90 shadow-[0_0_25px_rgba(99,102,241,0.15)]'
                  : isMaintenance
                  ? 'border-rose-500/30 bg-slate-950/70'
                  : 'border-white/10 bg-slate-950/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isBusy ? 'bg-emerald-400 animate-pulse' : isMaintenance ? 'bg-rose-400' : 'bg-slate-500'
                    }`}
                  />
                  <h4 className="text-sm font-bold text-white">{st.name}</h4>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                    isBusy
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isMaintenance
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isBusy ? 'PLAYING' : isMaintenance ? 'MAINTENANCE' : 'READY'}
                </span>
              </div>

              {/* Station Timer Box */}
              <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'ar' ? 'مدة الجلسة الحالية' : 'Session Elapsed Time'}
                </span>
                <p className="font-mono text-3xl font-black text-white tabular-nums tracking-widest">
                  {formatTime(st.elapsedSeconds)}
                </p>
                <p className="text-xs text-sky-400 font-mono font-bold">
                  {st.hourlyRate} EGP/hr • Total: {st.totalIncome} EGP
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => toggleStation(st.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                  isBusy
                    ? 'border border-rose-500/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                    : 'border border-emerald-400 bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isBusy
                  ? (language === 'ar' ? 'إنهاء الجلسة وحساب الفاتورة' : 'End Session & Bill')
                  : (language === 'ar' ? 'بدء تشغيل الجهاز' : 'Start New Session')}
              </button>
            </SpotlightCard>
          )
        })}
      </div>
    </div>
  )
}
