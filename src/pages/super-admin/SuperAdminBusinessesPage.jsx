import { useEffect, useState } from 'react'
import {
  createBusiness,
  deleteBusiness,
  fetchBusinesses,
  updateBusiness,
} from '../../services/brandingService'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

const emptyForm = {
  name: '',
  brand_name: '',
  primary_color: '#38bdf8',
  secondary_color: '#f59e0b',
  logo_url: '',
  ps_device_count: '4',
}

export default function SuperAdminBusinessesPage() {
  const { t, language, isRtl } = useLanguage()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  async function loadBusinesses() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchBusinesses()
      setBusinesses(data || [])
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load businesses.')
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBusinesses()
  }, [])

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      brand_name: item.brand_name || '',
      primary_color: item.primary_color || '#38bdf8',
      secondary_color: item.secondary_color || '#f59e0b',
      logo_url: item.logo_url || '',
      ps_device_count: String(item.ps_device_count ?? 4),
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        brand_name: form.brand_name.trim() || null,
        primary_color: form.primary_color.trim() || null,
        secondary_color: form.secondary_color.trim() || null,
        logo_url: form.logo_url.trim() || null,
        ps_device_count: Math.max(0, Number(form.ps_device_count || 0)),
      }

      if (editingId) {
        await updateBusiness(editingId, payload)
      } else {
        await createBusiness(payload)
      }

      resetForm()
      await loadBusinesses()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to save business data.')
    } finally {
      setSaving(false)
    }
  }

  async function removeBusiness(businessId) {
    const ok = window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا النشاط؟' : 'Are you sure you want to delete this venue?')
    if (!ok) return
    setSaving(true)
    setError('')
    try {
      await deleteBusiness(businessId)
      if (editingId === businessId) resetForm()
      await loadBusinesses()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to delete business.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-sky-400">
            <AppIcon name="building" size={22} />
          </div>
          <div>
            <ShinyText text={t('navBusinesses')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'إدارة صالات الألعاب، عدد أجهزة البلايستيشن، وتراخيص الاستخدام' : 'Manage venues, PS5 console counts, and active licensing'}
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

      {/* Business Form */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <AppIcon name={editingId ? 'edit' : 'plus'} size={16} />
            <span>
              {editingId
                ? (language === 'ar' ? 'تعديل بيانات الصالة' : 'Edit Venue')
                : (language === 'ar' ? 'إضافة صالة جديدة' : 'Add New Venue')}
            </span>
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-white"
            >
              {language === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit'}
            </button>
          )}
        </div>

        <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'الاسم الإداري للنشاط' : 'Business Legal Name'}
            </label>
            <input
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
              placeholder="e.g. Arena Cairo"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'اسم العلامة التجارية' : 'Brand Display Name'}
            </label>
            <input
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
              placeholder="e.g. FIFA Arena"
              value={form.brand_name}
              onChange={(e) => setForm((s) => ({ ...s, brand_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'عدد أجهزة البلايستيشن' : 'PS5 Console Count'}
            </label>
            <input
              type="number"
              min="0"
              max="64"
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
              value={form.ps_device_count}
              onChange={(e) => setForm((s) => ({ ...s, ps_device_count: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'اللون الأساسي' : 'Primary Color'}
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white font-mono focus:border-sky-400 focus:outline-none"
              value={form.primary_color}
              onChange={(e) => setForm((s) => ({ ...s, primary_color: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'اللون الثانوي' : 'Secondary Color'}
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white font-mono focus:border-sky-400 focus:outline-none"
              value={form.secondary_color}
              onChange={(e) => setForm((s) => ({ ...s, secondary_color: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'رابط الشعار' : 'Logo URL'}
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
              placeholder="https://..."
              value={form.logo_url}
              onChange={(e) => setForm((s) => ({ ...s, logo_url: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-sky-400 bg-sky-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 disabled:opacity-50"
            >
              <AppIcon name="save" size={14} />
              <span>
                {saving
                  ? t('loading')
                  : editingId
                  ? (language === 'ar' ? 'تحديث الصالة' : 'Update Venue')
                  : (language === 'ar' ? 'إنشاء الصالة' : 'Create Venue')}
              </span>
            </button>
          </div>
        </form>
      </SpotlightCard>

      {/* Businesses Table */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`min-w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="border-b border-white/10 bg-slate-900/80 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'الاسم' : 'Venue'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'العلامة' : 'Brand Name'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'أجهزة البلايستيشن' : 'PS5 Consoles'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'انتهاء الاشتراك' : 'Subscription'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                    {t('loading')}
                  </td>
                </tr>
              ) : businesses.length ? (
                businesses.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                      <AppIcon name="building" size={14} className="text-sky-400" />
                      <span>{item.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{item.brand_name || '--'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 font-bold font-mono">
                        {item.ps_device_count ?? 0} PS5
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.subscription_expires_at ? new Date(item.subscription_expires_at).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-300 hover:bg-sky-500/20"
                        >
                          <AppIcon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBusiness(item.id)}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                        >
                          <AppIcon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    {language === 'ar' ? 'لا توجد أنشطة تجارية مسجلة' : 'No venues configured yet.'}
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
