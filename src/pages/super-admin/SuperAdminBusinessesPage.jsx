import { useEffect, useState } from 'react'
import {
  createBusiness,
  deleteBusiness,
  fetchBusinesses,
  updateBusiness,
} from '../../services/brandingService'
import { formatArabicDate } from '../../utils/format'

const emptyForm = {
  name: '',
  brand_name: '',
  primary_color: '',
  secondary_color: '',
  logo_url: '',
}

export default function SuperAdminBusinessesPage() {
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
      setError(requestError?.response?.data?.message || 'تعذر تحميل الأنشطة التجارية.')
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
      primary_color: item.primary_color || '',
      secondary_color: item.secondary_color || '',
      logo_url: item.logo_url || '',
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
      }

      if (editingId) {
        await updateBusiness(editingId, payload)
      } else {
        await createBusiness(payload)
      }

      resetForm()
      await loadBusinesses()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر حفظ بيانات النشاط.')
    } finally {
      setSaving(false)
    }
  }

  async function removeBusiness(businessId) {
    setSaving(true)
    setError('')
    try {
      await deleteBusiness(businessId)
      if (editingId === businessId) resetForm()
      await loadBusinesses()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر حذف النشاط.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">إدارة الأنشطة التجارية</h2>

      <form className="rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={submitForm}>
        <p className="text-base font-semibold">{editingId ? 'تعديل نشاط' : 'إضافة نشاط جديد'}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field
            placeholder="اسم النشاط"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            required
          />
          <Field
            placeholder="العلامة التجارية"
            value={form.brand_name}
            onChange={(event) => setForm((state) => ({ ...state, brand_name: event.target.value }))}
          />
          <Field
            placeholder="اللون الأساسي (مثال: #c9a227)"
            value={form.primary_color}
            onChange={(event) => setForm((state) => ({ ...state, primary_color: event.target.value }))}
          />
          <Field
            placeholder="اللون الثانوي (مثال: #4e82be)"
            value={form.secondary_color}
            onChange={(event) => setForm((state) => ({ ...state, secondary_color: event.target.value }))}
          />
          <Field
            placeholder="رابط الشعار"
            value={form.logo_url}
            onChange={(event) => setForm((state) => ({ ...state, logo_url: event.target.value }))}
            className="md:col-span-2"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
          >
            {saving ? 'جار الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة النشاط'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm"
            >
              إلغاء التعديل
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-white/5 text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">النشاط</th>
              <th className="px-4 py-3">العلامة</th>
              <th className="px-4 py-3">نهاية الاشتراك</th>
              <th className="px-4 py-3">تاريخ الإنشاء</th>
              <th className="px-4 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={5}>
                  جار تحميل الأنشطة...
                </td>
              </tr>
            ) : businesses.length ? (
              businesses.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.brand_name || '--'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicDate(item.subscription_expires_at)}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-xs"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBusiness(item.id)}
                        disabled={saving}
                        className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 disabled:opacity-60"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={5}>
                  لا توجد أنشطة حاليا.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Field({ value, onChange, placeholder, required = false, className = '' }) {
  return (
    <input
      className={`min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 ${className}`.trim()}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  )
}

