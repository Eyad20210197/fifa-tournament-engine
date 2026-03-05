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
  ps_device_count: '0',
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
      primary_color: item.primary_color || '',
      secondary_color: item.secondary_color || '',
      logo_url: item.logo_url || '',
      ps_device_count: String(item.ps_device_count ?? 0),
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
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Business Management</h2>

      <form className="rounded-2xl border border-white/10 bg-white/5 p-4" onSubmit={submitForm}>
        <p className="text-base font-semibold">{editingId ? 'Edit business' : 'Add business'}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field
            placeholder="Business name"
            value={form.name}
            onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            required
          />
          <Field
            placeholder="Brand name"
            value={form.brand_name}
            onChange={(event) => setForm((state) => ({ ...state, brand_name: event.target.value }))}
          />
          <Field
            placeholder="Primary color (example: #c9a227)"
            value={form.primary_color}
            onChange={(event) => setForm((state) => ({ ...state, primary_color: event.target.value }))}
          />
          <Field
            placeholder="Secondary color (example: #4e82be)"
            value={form.secondary_color}
            onChange={(event) => setForm((state) => ({ ...state, secondary_color: event.target.value }))}
          />
          <Field
            placeholder="Logo URL"
            value={form.logo_url}
            onChange={(event) => setForm((state) => ({ ...state, logo_url: event.target.value }))}
            className="md:col-span-2"
          />
          <Field
            type="number"
            min={0}
            placeholder="PS devices count"
            value={form.ps_device_count}
            onChange={(event) => setForm((state) => ({ ...state, ps_device_count: event.target.value }))}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Save edits' : 'Add business'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-11 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-white/5 text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">PS Devices</th>
              <th className="px-4 py-3">Subscription End</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={6}>
                  Loading businesses...
                </td>
              </tr>
            ) : businesses.length ? (
              businesses.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.brand_name || '--'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.ps_device_count ?? 0}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicDate(item.subscription_expires_at)}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBusiness(item.id)}
                        disabled={saving}
                        className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={6}>
                  No businesses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Field({ value, onChange, placeholder, required = false, className = '', type = 'text', min }) {
  return (
    <input
      className={`min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 ${className}`.trim()}
      type={type}
      min={min}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  )
}
