import { useEffect, useMemo, useState } from 'react'
import { fetchDeviceRuntimeSnapshot, updateDeviceStatus } from '../../services/deviceRuntimeService'

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export default function DeviceRuntimePage() {
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
    if (!silent) {
      setLoading(true)
    }

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
      setError(requestError?.response?.data?.message || 'Failed to load device runtime data.')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadSnapshot()
  }, [])

  useEffect(() => {
    const refreshId = setInterval(() => {
      void loadSnapshot({ silent: true })
    }, 15000)

    return () => clearInterval(refreshId)
  }, [])

  useEffect(() => {
    const tickId = setInterval(() => {
      setTick(Date.now())
    }, 1000)

    return () => clearInterval(tickId)
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
      setError(requestError?.response?.data?.message || 'Failed to update device status.')
    } finally {
      setTogglingDevice(null)
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Configured devices" value={snapshot.deviceCount || 0} />
        <StatCard label="Currently online" value={snapshot.totals?.currentlyOnlineCount || 0} />
        <StatCard label="Total ON time" value={formatDuration(computedTotalOnSeconds)} />
      </div>

      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">Loading devices...</div>
      ) : snapshot.deviceCount > 0 ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Devices</h2>
              <button
                type="button"
                onClick={() => void loadSnapshot()}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs"
              >
                Refresh
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {liveDevices.map((device) => (
                <article key={device.deviceNumber} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">PS Device #{device.deviceNumber}</p>
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        device.isOnline ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-500/20 text-slate-200',
                      ].join(' ')}
                    >
                      {device.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                    <p>Current session: {formatDuration(device.displayCurrentOnlineSeconds)}</p>
                    <p>Total on time: {formatDuration(device.displayTotalOnSeconds)}</p>
                  </div>

                  <button
                    type="button"
                    disabled={togglingDevice === device.deviceNumber}
                    onClick={() => void toggleDeviceStatus(device.deviceNumber, !device.isOnline)}
                    className={[
                      'mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60',
                      device.isOnline ? 'border border-rose-300/40 bg-rose-500/10 text-rose-200' : 'bg-emerald-400 text-[#04220f]',
                    ].join(' ')}
                  >
                    {togglingDevice === device.deviceNumber
                      ? 'Saving...'
                      : device.isOnline
                        ? 'Go Offline'
                        : 'Go Online'}
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-white/5 text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Devices ON</th>
                  <th className="px-4 py-3">Total ON time</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.dailySummary?.length ? (
                  snapshot.dailySummary.map((row) => (
                    <tr key={row.day} className="border-t border-white/10">
                      <td className="px-4 py-3">{row.day}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{row.devicesOnCount}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDuration(row.totalOnSeconds)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={3}>
                      No runtime sessions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
          No devices are configured for this business yet. Ask Super Admin to set the PS devices count.
        </div>
      )}
    </section>
  )
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--secondary-color)]">{value}</p>
    </article>
  )
}
