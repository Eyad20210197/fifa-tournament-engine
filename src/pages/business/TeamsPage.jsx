import { Link } from 'react-router-dom'

export default function TeamsPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold">إدارة الفرق</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          تمت إدارة الفرق بالكامل ضمن صفحة إدارة البطولة، مع إعادة توليد المباريات تلقائيا بعد حفظ الفرق.
        </p>
        <Link
          to="/saas/schedule"
          className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]"
        >
          الانتقال إلى إدارة البطولة
        </Link>
      </div>
    </section>
  )
}

