import { useEffect, useState } from 'react'
import { fetchBusinesses, updateBusinessSubscription } from '../../services/brandingService'
import { formatArabicDate } from '../../utils/format'

function toDateInputValue(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export default function SuperAdminSubscriptionsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [dateByBusiness, setDateByBusiness] = useState({})

  async function loadBusinesses() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchBusinesses()
      const now = Date.now()
      const nextRows = (data || []).map((item) => ({
        ...item,
        isActive: new Date(item.subscription_expires_at || 0).getTime() > now,
      }))
      setRows(nextRows)

      const nextDates = {}
      for (const item of nextRows) {
        nextDates[item.id] = toDateInputValue(item.subscription_expires_at)
      }
      setDateByBusiness(nextDates)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر تحميل بيانات الاشتراكات.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBusinesses()
  }, [])

  async function setExpiration(businessId) {
    setSavingId(businessId)
    setError('')
    try {
      const selectedDate = dateByBusiness[businessId]
      const value = selectedDate ? `${selectedDate}T23:59:59Z` : null
      await updateBusinessSubscription(businessId, value)
      await loadBusinesses()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر تحديث تاريخ انتهاء الاشتراك.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-y-4">
      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-white/5 text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">النشاط</th>
              <th className="px-4 py-3">نهاية الاشتراك</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">تحديث الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={4}>
                  جار تحميل بيانات الاشتراكات...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicDate(item.subscription_expires_at)}</td>
                  <td className="px-4 py-3">
                    <span className={item.isActive ? 'text-emerald-300' : 'text-rose-300'}>{item.isActive ? 'نشط' : 'منتهي'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <input
                        type="date"
                        className="min-h-10 rounded-xl border border-white/15 bg-black/25 px-3 py-2"
                        value={dateByBusiness[item.id] || ''}
                        onChange={(event) =>
                          setDateByBusiness((state) => ({
                            ...state,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => setExpiration(item.id)}
                        className="rounded-xl bg-[var(--primary-color)] px-3 py-2 text-xs font-semibold text-[#07162b] disabled:opacity-60"
                      >
                        حفظ
                      </button>
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => {
                          setDateByBusiness((state) => ({ ...state, [item.id]: '' }))
                          void setExpiration(item.id)
                        }}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs disabled:opacity-60"
                      >
                        إلغاء التاريخ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={4}>
                  لا تتوفر بيانات اشتراكات حاليا.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

