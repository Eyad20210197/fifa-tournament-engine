import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTournamentStore } from '../store/tournamentStore'
import { downloadTextFile } from '../utils/download'
import { TeamManager } from '../components/common/TeamManager'
import { TournamentGenerator } from '../components/common/TournamentGenerator'
import { SponsorManager } from '../components/common/SponsorManager'
import { MatchControl } from '../components/common/MatchControl'
import { VideoManager } from '../components/common/VideoManager'
import { useAblyChannel } from '../hooks/useAblyChannel'
import { tournamentChannel } from '../services/channelNames'
import { fetchCurrentLiveState } from '../services/liveStateService'
import { fetchTournamentDetails, fetchTournaments } from '../services/tournamentService'
import { useAuth } from '../auth/useAuth'
import { useLanguage } from '../i18n/LanguageContext'
import { ROLES } from '../auth/roles'
import {
  isLikelyIncompleteLiveSnapshot,
  mapTournamentDetailsToLiveState,
  mergeLiveSnapshotWithTournamentDetails,
} from '../utils/tournament/liveSnapshot'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function Control() {
  const { role } = useAuth()
  const { t, language, isRtl } = useLanguage()
  const isAdmin = role === ROLES.ADMIN
  const hydrated = useTournamentStore((s) => s._meta.hydrated)
  const tournamentName = useTournamentStore((s) => s.tournament.name)
  const tournamentId = useTournamentStore((s) => s.tournament.id)
  const activeScreen = useTournamentStore((s) => s.activeScreen)
  const setActiveScreen = useTournamentStore((s) => s.setActiveScreen)
  const exportJSON = useTournamentStore((s) => s.exportJSON)
  const importJSON = useTournamentStore((s) => s.importJSON)
  const resetAll = useTournamentStore((s) => s.resetAll)

  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function bootstrapControl() {
      const snapshot = await fetchCurrentLiveState().catch(() => null)
      if (snapshot && !isLikelyIncompleteLiveSnapshot(snapshot)) {
        const snapshotTournamentId = Number(snapshot?.tournament?.id)
        if (Number.isFinite(snapshotTournamentId) && snapshotTournamentId > 0) {
          const details = await fetchTournamentDetails(snapshotTournamentId).catch(() => null)
          if (details) {
            useTournamentStore.getState().applyRemoteState(mergeLiveSnapshotWithTournamentDetails(snapshot, details))
            return
          }
        }
        useTournamentStore.getState().applyRemoteState(snapshot)
      } else {
        const tournaments = await fetchTournaments().catch(() => [])
        const target =
          tournaments.find((item) => item.status === 'live') ||
          tournaments.find((item) => item.status === 'scheduled') ||
          tournaments[0]

        if (target?.id) {
          const details = await fetchTournamentDetails(Number(target.id)).catch(() => null)
          if (details) {
            useTournamentStore.getState().applyRemoteState(mapTournamentDetailsToLiveState(details))
            useTournamentStore.getState().setActiveScreen(useTournamentStore.getState().activeScreen || 'opening')
          }
        }
      }
    }

    void bootstrapControl()
  }, [])

  useAblyChannel(tournamentChannel(tournamentId), 'state:update', (data) => {
    const snapshot = data?.snapshot || data?.payload || data
    if (snapshot && typeof snapshot === 'object' && !isLikelyIncompleteLiveSnapshot(snapshot)) {
      useTournamentStore.getState().applyRemoteState(snapshot)
    }
  })

  useAblyChannel(tournamentChannel(tournamentId), 'timer:update', (data) => {
    if (data?.matchId != null) {
      useTournamentStore.getState().applyMatchTimerUpdate(data)
    }
  })

  useAblyChannel(tournamentChannel(tournamentId), 'timer:clear', (data) => {
    if (data?.matchId != null) {
      useTournamentStore.getState().clearMatchTimerLocal(data.matchId)
    }
  })

  const screens = useMemo(
    () => [
      { id: 'opening', label: language === 'ar' ? 'شاشة الافتتاح' : 'Opening Screen', icon: 'sparkles' },
      { id: 'live', label: language === 'ar' ? 'مباراة مباشرة' : 'Live Match Hero', icon: 'live' },
      { id: 'standings', label: language === 'ar' ? 'جدول الترتيب' : 'Standings Table', icon: 'trophy' },
      { id: 'bracket', label: language === 'ar' ? 'شجرة البطولة' : 'Knockout Bracket', icon: 'layers' },
      { id: 'schedule', label: language === 'ar' ? 'جدول المباريات' : 'Match Schedule', icon: 'calendar' },
    ],
    [language],
  )

  const displayUrl = useMemo(() => new URL('/display', window.location.href).toString(), [])

  async function onImportFile(file) {
    if (!file) return
    setImportError(null)
    try {
      const text = await file.text()
      await importJSON(text)
    } catch (error) {
      setImportError(error?.message || (language === 'ar' ? 'فشل الاستيراد' : 'Failed to import JSON'))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white selection:bg-sky-500/30">
      <div className="mx-auto w-full max-w-[1700px] space-y-6">
        {/* Top Control Bar */}
        <SpotlightCard className="border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/20 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                <AppIcon name="gamepad" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  {t('matchControlTitle')}
                </p>
                <ShinyText text={tournamentName || 'FIFA Esports'} className="text-xl font-black text-white" />
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'ar' ? 'الحالة:' : 'Status:'} <strong className="text-emerald-400">{hydrated ? t('online') : t('loading')}</strong> • {language === 'ar' ? 'الشاشة الموجهة للجمهور:' : 'Broadcast Screen:'} <strong className="text-amber-300">{activeScreen}</strong>
                </p>
              </div>
            </div>

            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition hover:bg-sky-400"
                  onClick={() => downloadTextFile(`fifa-backup-${Date.now()}.json`, exportJSON())}
                >
                  <AppIcon name="download" size={14} />
                  <span>{language === 'ar' ? 'تصدير نسخة' : 'Export JSON'}</span>
                </button>

                <input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  accept="application/json"
                  onChange={(event) => onImportFile(event.target.files?.[0])}
                />
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <AppIcon name="save" size={14} />
                  <span>{language === 'ar' ? 'استيراد' : 'Import'}</span>
                </button>

                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20"
                  onClick={() => resetAll()}
                >
                  <AppIcon name="refresh" size={14} />
                  <span>{language === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
                </button>
              </div>
            ) : null}
          </div>

          {importError ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
              <AppIcon name="alert" size={16} className="text-rose-400" />
              <span>{importError}</span>
            </div>
          ) : null}

          {/* Screen Switcher Radio Buttons */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {language === 'ar' ? 'تبديل الشاشة المعروضة على شاشات العرض الكبرى (Cinema Display):' : 'Switch Live Broadcast Display View:'}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {screens.map((screen) => {
                const isActive = activeScreen === screen.id
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setActiveScreen(screen.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                      isActive
                        ? 'border-sky-400 bg-sky-500/20 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                        : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <AppIcon name={screen.icon} size={15} />
                    <span>{screen.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </SpotlightCard>

        {/* Display Link & Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <SpotlightCard className="border border-white/10 bg-slate-950/80 p-4">
            <p className="text-xs font-bold text-sky-400">{language === 'ar' ? 'رابط شاشة الجمهور الكبرى' : 'Spectator Screen URL'}</p>
            <p className="text-xs text-slate-400 mt-1">{language === 'ar' ? 'افتح هذا الرابط على شاشة التلفاز أو البروجكتور في الصالة:' : 'Open this URL on venue big screens / projectors:'}</p>
            <code className="mt-2 block rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-amber-300 font-mono select-all">
              {displayUrl}
            </code>
          </SpotlightCard>

          <SpotlightCard className="border border-white/10 bg-slate-950/80 p-4">
            <p className="text-xs font-bold text-sky-400">{language === 'ar' ? 'تعليمات التحكيم والتشغيل' : 'Referee Operations'}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isAdmin
                ? (language === 'ar' ? 'قم بتحديث النتيجة أولاً بأول لتظهر مباشرة على شاشات العرض بدون تأخير.' : 'Update scores in real-time to broadcast to spectator displays without delay.')
                : (language === 'ar' ? 'طاقم التشغيل: تحكم في نتيجة المباراة الجارية واضغط إنهاء لتثبيت الفائز.' : 'Staff: Manage live match score and press end match to lock result.')}
            </p>
          </SpotlightCard>
        </div>

        {/* Match Control Component */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl">
          <MatchControl />
        </div>

        {isAdmin ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl">
              <TeamManager />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl">
              <TournamentGenerator />
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl">
                <SponsorManager />
              </div>
              <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl">
                <VideoManager />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
