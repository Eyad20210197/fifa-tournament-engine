import { useEffect, useState } from 'react'
import { fetchBusinesses } from '../../services/brandingService'
import { formatArabicNumber } from '../../utils/format'

export default function SuperAdminAccountsPage() {
  const [stats, setStats] = useState({ total: 0, active: 0 })

  useEffect(() => {
    fetchBusinesses()
      .then((items) => {
        const active = items.filter((item) => new Date(item.subscription_expires_at || 0).getTime() > Date.now()).length
        setStats({ total: items.length, active })
      })
      .catch(() => setStats({ total: 0, active: 0 }))
  }, [])

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="إجمالي الحسابات" value={formatArabicNumber(stats.total)} />
        <Card title="الحسابات النشطة" value={formatArabicNumber(stats.active)} />
        <Card title="الحسابات المنتهية" value={formatArabicNumber(Math.max(0, stats.total - stats.active))} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
        هذه الصفحة مخصصة لمشرف المنصة لمتابعة حسابات الأنشطة وصحتها التشغيلية دون تغيير منطق الخلفية الحالي.
      </div>
    </section>
  )
}

function Card({ title, value }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-[var(--text-secondary)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--secondary-color)]">{value}</p>
    </article>
  )
}
