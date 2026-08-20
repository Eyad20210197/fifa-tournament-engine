import { useEffect, useMemo, useState } from 'react'
import { createUser, fetchUsers } from '../../services/userService'
import { fetchBusinesses } from '../../services/brandingService'
import { useLanguage } from '../../i18n/LanguageContext'
import AppIcon from '../../components/common/AppIcon'
import ShinyText from '../../components/reactbits/ShinyText'
import SpotlightCard from '../../components/reactbits/SpotlightCard'

const initialForm = {
  username: '',
  password: '',
  role: 'STAFF',
  business_id: '',
}

export default function UsersPage() {
  const { t, language, isRtl } = useLanguage()
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
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر تحميل بيانات المستخدمين.' : 'Failed to load users.'))
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
      setError(requestError?.response?.data?.message || (language === 'ar' ? 'تعذر إنشاء المستخدم.' : 'Failed to create user.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* Create User Card */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/20 text-sky-400">
            <AppIcon name="users" size={20} />
          </div>
          <div>
            <ShinyText text={t('navUsers')} className="text-lg font-bold text-white" />
            <p className="text-xs text-slate-400">{language === 'ar' ? 'إضافة وتعيين صلاحيات الطاقم والمحكمين' : 'Add referees and operations staff'}</p>
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input
            className="rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            placeholder={language === 'ar' ? 'اسم المستخدم (مثال: referee_1)' : 'Username'}
            value={form.username}
            onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
            required
          />
          <input
            type="password"
            className="rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            placeholder={language === 'ar' ? 'كلمة المرور' : 'Password'}
            value={form.password}
            onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
            minLength={6}
            required
          />
          <select
            className="rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
            value={form.role}
            onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}
          >
            <option value="STAFF">STAFF (طاقم تشغيل / حكام)</option>
            <option value="ADMIN">ADMIN (مدير النشاط)</option>
          </select>
          <select
            className="rounded-xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
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
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-400 bg-sky-500 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition hover:bg-sky-400 disabled:opacity-50 md:col-span-2 active:scale-95"
          >
            <AppIcon name="plus" size={15} />
            <span>{submitting ? t('loading') : (language === 'ar' ? 'إنشاء حساب المستخدم' : 'Create User Account')}</span>
          </button>
        </form>
      </SpotlightCard>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs font-bold text-rose-200">
          <AppIcon name="alert" size={16} className="text-rose-400" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Users Table */}
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`min-w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="border-b border-white/10 bg-slate-900/80 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'المستخدم' : 'Username'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الدور' : 'Role'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'النشاط التجاري' : 'Venue'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</th>
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
                      <AppIcon name="user" size={14} className="text-sky-400" />
                      <span>{item.username}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                        {item.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{item.businessName}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                    {language === 'ar' ? 'لا يوجد مستخدمون حالياً.' : 'No users found.'}
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
