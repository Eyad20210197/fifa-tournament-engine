import { useEffect, useMemo, useState } from 'react'
import { createUser, fetchUsers } from '../../services/userService'
import { fetchBusinesses } from '../../services/brandingService'
import { formatArabicDateTime } from '../../utils/format'

const initialForm = {
  username: '',
  password: '',
  role: 'STAFF',
  business_id: '',
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [usersRows, businessRows] = await Promise.all([fetchUsers(), fetchBusinesses()])
      setUsers(usersRows || [])
      setBusinesses(businessRows || [])
      setForm((current) => ({
        ...current,
        business_id: current.business_id || String(businessRows?.[0]?.id || ''),
      }))
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر تحميل بيانات المستخدمين.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const rows = useMemo(
    () =>
      users.map((item) => ({
        ...item,
        businessName: businesses.find((b) => Number(b.id) === Number(item.business_id))?.name || `#${item.business_id}`,
      })),
    [users, businesses],
  )

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await createUser({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        business_id: Number(form.business_id),
      })
      setForm((current) => ({ ...initialForm, business_id: current.business_id }))
      await loadData()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'تعذر إنشاء المستخدم.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold">إضافة مستخدم</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input
            className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
            placeholder="اسم المستخدم"
            value={form.username}
            onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
            required
          />
          <input
            type="password"
            className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
            placeholder="كلمة المرور"
            value={form.password}
            onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
            minLength={6}
            required
          />
          <select
            className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
            value={form.role}
            onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}
          >
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <select
            className="min-h-11 rounded-2xl border border-white/15 bg-black/25 px-3 py-2"
            value={form.business_id}
            onChange={(event) => setForm((state) => ({ ...state, business_id: event.target.value }))}
            required
          >
            {businesses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b] disabled:opacity-60 md:col-span-2"
          >
            {submitting ? 'جار الإنشاء...' : 'إنشاء المستخدم'}
          </button>
        </form>
      </div>

      {error ? <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-white/5 text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">المستخدم</th>
              <th className="px-4 py-3">الدور</th>
              <th className="px-4 py-3">النشاط</th>
              <th className="px-4 py-3">تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={4}>
                  جار تحميل المستخدمين...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{item.username}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.role}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.businessName}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{formatArabicDateTime(item.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-[var(--text-secondary)]" colSpan={4}>
                  لا يوجد مستخدمون حاليا.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

