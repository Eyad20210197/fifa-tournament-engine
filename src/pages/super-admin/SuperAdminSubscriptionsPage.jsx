import { useEffect, useState } from 'react'
import { fetchBusinesses, updateBusinessSubscription } from '../../services/brandingService'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

function toDateInputValue(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export default function SuperAdminSubscriptionsPage() {
  const { t, language, isRtl } = useLanguage()
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
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر تحميل بيانات الاشتراكات.' : 'Failed to load subscriptions.'))
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
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر تحديث تاريخ انتهاء الاشتراك.' : 'Failed to update subscription.'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
            <AppIcon name="receipt" size={22} />
          </div>
          <div>
            <ShinyText text={t('navSubscriptionsAdmin')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'تجديد وتعيين تراخيص وصلاحيات صالات الألعاب' : 'Manage and extend venue licenses'}
            </p>
          </div>
        </div>
      </SpotlightCard>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`min-w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="border-b border-white/10 bg-slate-900/80 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'النشاط التجاري' : 'Venue'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expires At'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'تعديل الصلاحية' : 'Update Expiry'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                    {t('loading')}
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                      <AppIcon name="building" size={14} className="text-sky-400" />
                      <span>{item.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          item.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.isActive ? (language === 'ar' ? 'نشط' : 'ACTIVE') : (language === 'ar' ? 'منتهي' : 'EXPIRED')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.subscription_expires_at ? new Date(item.subscription_expires_at).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-white focus:border-sky-400 focus:outline-none"
                          value={dateByBusiness[item.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setDateByBusiness((s) => ({ ...s, [item.id]: val }))
                          }}
                        />
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => setExpiration(item.id)}
                          className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
                        >
                          {savingId === item.id ? t('loading') : (language === 'ar' ? 'حفظ' : 'Save')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    {language === 'ar' ? 'لا توجد أنشطة تجارية.' : 'No businesses found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </section>
  )
}
