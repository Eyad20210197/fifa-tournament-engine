import { useEffect, useMemo, useState } from 'react'
import { fetchDeviceRuntimeSnapshot, updateDeviceStatus } from '../../services/deviceRuntimeService'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export default function DeviceRuntimePage() {
  const { t, language, isRtl } = useLanguage()
  const [snapshot, setSnapshot] = useState({
    deviceCount: 0,
    devices: [],
    dailySummary: [],
    totals: { totalOnSeconds: 0, currentlyOnlineCount: 0 },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [togglingDevice, setTogglingDevice] = useState(null)
  const [snapshotAt, setSnapshotAt] = useState(0)
  const [tick, setTick] = useState(0)

  async function loadSnapshot({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      const data = await fetchDeviceRuntimeSnapshot()
      setSnapshot(
        data || {
          deviceCount: 0,
          devices: [],
          dailySummary: [],
          totals: { totalOnSeconds: 0, currentlyOnlineCount: 0 },
        },
      )
      setSnapshotAt(Date.now())
      setError('')
    } catch (requestError) {
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر تحميل بيانات الأجهزة.' : 'Failed to load device runtime data.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadSnapshot()
    const refreshId = setInterval(() => void loadSnapshot({ silent: true }), 15000)
    const tickId = setInterval(() => setTick(Date.now()), 1000)
    return () => {
      clearInterval(refreshId)
      clearInterval(tickId)
    }
  }, [])

  const elapsedSinceSnapshot = Math.max(0, Math.floor((tick - snapshotAt) / 1000))

  const liveDevices = useMemo(() => {
    return (snapshot.devices || []).map((device) => {
      const extra = device.isOnline ? elapsedSinceSnapshot : 0
      return {
        ...device,
        displayCurrentOnlineSeconds: (Number(device.currentOnlineSeconds) || 0) + extra,
        displayTotalOnSeconds: (Number(device.totalOnSeconds) || 0) + extra,
      }
    })
  }, [snapshot.devices, elapsedSinceSnapshot])

  const computedTotalOnSeconds = liveDevices.reduce((sum, device) => sum + device.displayTotalOnSeconds, 0)

  async function toggleDeviceStatus(deviceNumber, nextOnlineStatus) {
    setTogglingDevice(deviceNumber)
    setError('')
    try {
      const updatedSnapshot = await updateDeviceStatus(deviceNumber, nextOnlineStatus)
      if (updatedSnapshot) {
        setSnapshot(updatedSnapshot)
        setSnapshotAt(Date.now())
      } else {
        await loadSnapshot({ silent: true })
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر تحديث حالة الجهاز.' : 'Failed to update device status.'))
    } finally {
      setTogglingDevice(null)
    }
  }

  return (
    <section className="space-y-6">
      {/* Title & KPI Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/40 bg-indigo-500/20 text-indigo-400">
            <AppIcon name="gamepad" size={22} />
          </div>
          <div>
            <ShinyText text={t('deviceRuntimeTitle')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">{t('appSubtitle')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadSnapshot()}
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/10 active:scale-95"
        >
          <AppIcon name="refresh" size={14} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SpotlightCard className="border border-sky-500/30 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'ar' ? 'إجمالي الأجهزة المعرفة' : 'Configured Consoles'}</span>
            <AppIcon name="gamepad" size={18} className="text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{snapshot.deviceCount || 0} PS5</p>
        </SpotlightCard>

        <SpotlightCard className="border border-emerald-500/30 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'ar' ? 'أجهزة قيد التشغيل حالياً' : 'Currently Active Online'}</span>
            <AppIcon name="activity" size={18} className="text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-400">{snapshot.totals?.currentlyOnlineCount || 0}</p>
        </SpotlightCard>

        <SpotlightCard className="border border-amber-500/30 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('todayTotalRuntime')}</span>
            <AppIcon name="timer" size={18} className="text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-300 font-mono">{formatDuration(computedTotalOnSeconds)}</p>
        </SpotlightCard>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/15 p-3.5 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Devices Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">{t('loading')}</div>
      ) : snapshot.deviceCount > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liveDevices.map((device) => (
            <SpotlightCard
              key={device.deviceNumber}
              className={`border transition-all ${
                device.isOnline
                  ? 'border-emerald-500/40 bg-slate-950/90 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'border-white/10 bg-slate-950/70'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <AppIcon name="gamepad" size={18} className={device.isOnline ? 'text-emerald-400' : 'text-slate-500'} />
                  <span className="text-sm font-black text-white">PS5 Station #{device.deviceNumber}</span>
                </div>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    device.isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-white/10'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${device.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  {device.isOnline ? t('online') : t('offline')}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>{t('currentSessionTime')}:</span>
                  <strong className="text-emerald-300 font-mono text-sm">{formatDuration(device.displayCurrentOnlineSeconds)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('todayTotalRuntime')}:</span>
                  <strong className="text-white font-mono">{formatDuration(device.displayTotalOnSeconds)}</strong>
                </div>
              </div>

              <button
                type="button"
                disabled={togglingDevice === device.deviceNumber}
                onClick={() => void toggleDeviceStatus(device.deviceNumber, !device.isOnline)}
                className={`mt-4 w-full rounded-xl py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
                  device.isOnline
                    ? 'border border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                    : 'border border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400'
                }`}
              >
                {togglingDevice === device.deviceNumber
                  ? t('loading')
                  : device.isOnline
                  ? t('stopSession')
                  : t('startSession')}
              </button>
            </SpotlightCard>
          ))}
        </div>
      ) : (
        <SpotlightCard className="border border-white/10 bg-slate-950/80 py-12 text-center text-xs text-slate-400">
          <AppIcon name="gamepad" size={36} className="mx-auto mb-2 text-slate-600" />
          <p>{language === 'ar' ? 'لم يتم تحديد عدد الأجهزة بعد من قبل المشرف.' : 'No PlayStation stations configured yet.'}</p>
        </SpotlightCard>
      )}
    </section>
  )
}
