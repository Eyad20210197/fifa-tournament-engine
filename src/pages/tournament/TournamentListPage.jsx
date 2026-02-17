import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ResponsiveDataTable from '../../components/common/ResponsiveDataTable'
import { fetchTournaments } from '../../services/tournamentService'

export default function TournamentListPage() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    fetchTournaments()
      .then((data) => {
        setRows(
          data.map((item) => [
            item.id,
            item.name,
            item.format,
            item.status,
            item.starts_at ? new Date(item.starts_at).toLocaleString('ar-EG') : '--',
          ]),
        )
      })
      .catch(() => setRows([]))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">????????</h1>
        <Link className="rounded-xl bg-[#c9a227] px-4 py-2 text-sm font-semibold text-[#07162b]" to="/saas/tournaments/wizard">
          ????? ?????
        </Link>
      </div>
      <ResponsiveDataTable headers={['#', '?????', '?????', '??????', '???????']} rows={rows} />
    </div>
  )
}
