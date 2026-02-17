import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore } from '../store/tournamentStore'
import { RamadanStage } from '../components/common/RamadanStage'
import { downloadTextFile } from '../utils/download'
import { TeamManager } from '../components/common/TeamManager'
import { TournamentGenerator } from '../components/common/TournamentGenerator'
import { SponsorManager } from '../components/common/SponsorManager'
import { MatchControl } from '../components/common/MatchControl'
import { connectLiveStateSocket } from '../services/liveStateSocket'
import { fetchCurrentLiveState } from '../services/liveStateService'

export default function Control() {
  const hydrated = useTournamentStore((s) => s._meta.hydrated)
  const tournamentName = useTournamentStore((s) => s.tournament.name)
  const activeScreen = useTournamentStore((s) => s.activeScreen)
  const setActiveScreen = useTournamentStore((s) => s.setActiveScreen)
  const exportJSON = useTournamentStore((s) => s.exportJSON)
  const importJSON = useTournamentStore((s) => s.importJSON)
  const resetAll = useTournamentStore((s) => s.resetAll)

  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    void fetchCurrentLiveState().then((snapshot) => {
      if (snapshot) {
        useTournamentStore.getState().applyRemoteState(snapshot)
      }
    })
    connectLiveStateSocket()
  }, [])

  const screens = useMemo(
    () => [
      { id: 'opening', label: 'شاشة الافتتاح' },
      { id: 'live', label: 'مباراة مباشرة' },
      { id: 'standings', label: 'الترتيب' },
      { id: 'bracket', label: 'خروج مغلوب' },
      { id: 'schedule', label: 'الجدول' },
    ],
    [],
  )

  async function onImportFile(file) {
    if (!file) return
    setImportError(null)
    try {
      const text = await file.text()
      await importJSON(text)
    } catch (err) {
      setImportError(err?.message || 'فشل الاستيراد')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <RamadanStage>
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs text-white/60">لوحة التحكم</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-wide">{tournamentName}</h1>
              <div className="mt-1 text-sm text-white/70">
                الحالة: {hydrated ? 'جاهز' : 'جاري تحميل البيانات...'} • الشاشة الحالية: {labelFor(activeScreen)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b] hover:bg-[#f6d365]"
                onClick={() => downloadTextFile(`ramadan-fifa-2026-${Date.now()}.json`, exportJSON())}
              >
                تصدير البطولة
              </button>

              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={(e) => onImportFile(e.target.files?.[0])}
              />
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                onClick={() => fileInputRef.current?.click()}
              >
                استيراد بطولة
              </button>

              <button
                className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/15"
                onClick={() => resetAll()}
              >
                إعادة ضبط كاملة
              </button>
            </div>
          </div>

          {importError ? (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              {importError}
            </div>
          ) : null}

          <div className="mt-6">
            <div className="text-sm text-white/80">تبديل شاشة البث (تظهر فوراً في /display)</div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
              {screens.map((s) => {
                const isActive = activeScreen === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveScreen(s.id)}
                    className={[
                      'rounded-2xl border px-3 py-4 text-sm transition',
                      isActive
                        ? 'border-[#c9a227]/60 bg-[#c9a227]/10 text-[#f6d365]'
                        : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card title="رابط شاشة العرض">
              <div className="text-sm text-white/80">افتح هذا الرابط على شاشة التلفزيون:</div>
              <code className="mt-2 block rounded-xl bg-black/30 px-3 py-2 text-sm text-white/90">
                {location.origin}/display
              </code>
              <div className="mt-2 text-xs text-white/60">
                ملاحظة: بعد أول تحميل، التطبيق يعمل دون إنترنت.
              </div>
            </Card>

            <Card title="Next Steps">
              <div className="text-sm text-white/75">
                Add teams, choose a format, generate the tournament, then manage matches from the control section below.
              </div>
            </Card>
          </div>

          <div className="mt-8">
            <TeamManager />
          </div>

          <div className="mt-6">
            <TournamentGenerator />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-4">
            <SponsorManager />
            <div className="lg:col-span-3">
              <MatchControl />
            </div>
          </div>
        </motion.div>
      </div>
    </RamadanStage>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function labelFor(activeScreen) {
  switch (activeScreen) {
    case 'opening':
      return 'شاشة الافتتاح'
    case 'live':
      return 'مباراة مباشرة'
    case 'standings':
      return 'الترتيب'
    case 'bracket':
      return 'خروج مغلوب'
    case 'schedule':
      return 'الجدول'
    default:
      return activeScreen
  }
}
