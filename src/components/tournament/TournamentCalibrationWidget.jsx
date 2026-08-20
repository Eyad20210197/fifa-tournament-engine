import React from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import { calibrateTournament } from '../../utils/tournament/calibrationEngine'
import AppIcon from '../common/AppIcon'
import ShinyText from '../reactbits/ShinyText'
import SpotlightCard from '../reactbits/SpotlightCard'

export default function TournamentCalibrationWidget({
  config,
  onApplyPatch,
  onAutoCalibrate,
}) {
  const { t, language, isRtl } = useLanguage()

  const calibration = calibrateTournament({
    format: config.format,
    teamCount: config.teamsCount || (Array.isArray(config.teams) ? config.teams.length : 8),
    homeAwayEnabled: config.home_away_enabled,
    availableConsoles: config.available_consoles || 1,
    matchDurationMinutes: config.match_duration_minutes || 10,
    turnoverBufferMinutes: config.turnover_buffer_minutes || 2,
    tournamentDurationHours: config.tournament_duration_hours || 8,
  })

  const isCompatible = calibration.isCompatible

  return (
    <SpotlightCard
      className={`border transition-all duration-500 ${
        isCompatible
          ? 'border-emerald-500/40 bg-slate-950/80 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
          : 'border-rose-500/50 bg-slate-950/90 shadow-[0_0_35px_rgba(244,63,94,0.25)] animate-pulse'
      }`}
      spotlightColor={isCompatible ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.2)'}
    >
      {/* Top Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
              isCompatible
                ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                : 'border-rose-400/40 bg-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.5)]'
            }`}
          >
            <AppIcon
              name={isCompatible ? 'verified' : 'alert'}
              size={24}
              className={isCompatible ? '' : 'animate-bounce'}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                {t('calibrationTitle')}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  isCompatible
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isCompatible ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-ping'}`} />
                {isCompatible ? (language === 'ar' ? 'متوافق وجاهز' : 'COMPATIBLE') : (language === 'ar' ? 'تجاوز للوقت / تنبيه' : 'OVERRUN WARNING')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCompatible ? t('calibrationStatusCompatible') : t('calibrationStatusIncompatible')}
            </p>
          </div>
        </div>

        {onAutoCalibrate ? (
          <button
            type="button"
            onClick={onAutoCalibrate}
            className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 px-4 py-2 text-xs font-bold text-amber-300 transition-all hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95"
          >
            <AppIcon name="zap" size={16} className="text-amber-400" />
            <ShinyText text={t('autoCalibrateBtn')} gold />
          </button>
        ) : null}
      </div>

      {/* Knockout Rule Violation Alert */}
      {calibration.ruleViolation ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <AppIcon name="shield" size={18} className="mt-0.5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold leading-relaxed">
                {language === 'ar' ? calibration.ruleViolation.messageAr : calibration.ruleViolation.messageEn}
              </p>
              <p className="mt-1 text-amber-300/80">
                {t('ruleViolationSuggestLeague', {
                  count: config.teamsCount || 8,
                  nearest: `${calibration.ruleViolation.nearest.lower} / ${calibration.ruleViolation.nearest.upper}`,
                })}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Overrun Warning Alert */}
      {!calibration.isCompatible && calibration.overrunHours > 0 ? (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
          <div className="flex items-start gap-2.5">
            <AppIcon name="clock" size={18} className="mt-0.5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold leading-relaxed">
                {t('overrunWarning', {
                  needed: calibration.neededHours,
                  available: calibration.availableHours,
                  diff: calibration.overrunHours,
                })}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <AppIcon name="trophy" size={14} className="text-sky-400" />
            <span>{t('totalCalculatedMatches')}</span>
          </div>
          <p className="mt-1.5 text-xl font-black text-white">
            {calibration.totalMatches} <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'مباراة' : 'matches'}</span>
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <AppIcon name="timer" size={14} className="text-amber-400" />
            <span>{t('estimatedWallClockHours')}</span>
          </div>
          <p className={`mt-1.5 text-xl font-black ${isCompatible ? 'text-emerald-400' : 'text-rose-400'}`}>
            {calibration.neededHours} <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ساعة' : 'hrs'}</span>
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <AppIcon name="gamepad" size={14} className="text-indigo-400" />
            <span>{t('availableConsoles')}</span>
          </div>
          <p className="mt-1.5 text-xl font-black text-white">
            {calibration.consoles} <span className="text-xs font-normal text-slate-400">PS5</span>
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <AppIcon name="activity" size={14} className="text-cyan-400" />
            <span>{t('consoleUtilization')}</span>
          </div>
          <p className="mt-1.5 text-xl font-black text-cyan-400">
            {calibration.utilizationPercent}%
          </p>
        </div>
      </div>

      {/* Actionable Suggestions */}
      {calibration.suggestions && calibration.suggestions.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <p className="text-xs font-bold text-slate-300">{t('suggestionTitle')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {calibration.suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-3 transition-colors hover:border-sky-500/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">
                    {language === 'ar' ? suggestion.actionLabelAr : suggestion.actionLabelEn}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'ar' ? suggestion.effectAr : suggestion.effectEn}
                  </p>
                </div>
                {onApplyPatch ? (
                  <button
                    type="button"
                    onClick={() => onApplyPatch(suggestion.patch)}
                    className="shrink-0 rounded-lg border border-sky-500/30 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30 active:scale-95"
                  >
                    {language === 'ar' ? 'تطبيق الحل' : 'Apply'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SpotlightCard>
  )
}
