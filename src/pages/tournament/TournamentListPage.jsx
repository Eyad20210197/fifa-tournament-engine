import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ResponsiveDataTable from '../../components/common/ResponsiveDataTable'
import { fetchTournaments } from '../../services/tournamentService'
import { useAuth } from '../../auth/useAuth'
import { ROLES } from '../../auth/roles'
import { formatArabicDateTime } from '../../utils/format'

function translateStatus(status) {
  if (status === 'draft') return 'مسودة'
  if (status === 'scheduled') return 'مجدولة'
  if (status === 'live') return 'مباشرة'
  if (status === 'finished') return 'منتهية'
  return 'غير محددة'
}

export default function TournamentListPage() {
  const [rows, setRows] = useState([])
  const { role } = useAuth()

  useEffect(() => {
    fetchTournaments()
      .then((data) => {
        setRows(
          data.map((item) => [item.id, item.name, item.format, translateStatus(item.status), formatArabicDateTime(item.starts_at)]),
        )
      })
      .catch(() => setRows([]))
  }, [])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">المباريات والبطولات</h2>
        {role === ROLES.ADMIN ? (
          <Link
            className="min-h-11 rounded-2xl bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[#07162b]"
            to="/saas/tournaments/wizard"
          >
            إنشاء بطولة
          </Link>
        ) : null}
      </div>
      <ResponsiveDataTable headers={['#', 'اسم البطولة', 'النمط', 'الحالة', 'موعد البداية']} rows={rows} />
    </section>
  )
}
