import { useEffect, useState } from 'react'
import ResponsiveDataTable from '../../components/common/ResponsiveDataTable'
import { fetchBusinesses } from '../../services/brandingService'

export default function SuperAdminBusinessesPage() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    fetchBusinesses()
      .then((data) =>
        setRows(
          data.map((item) => [
            item.id,
            item.name,
            item.brand_name || '--',
            item.subscription_expires_at ? new Date(item.subscription_expires_at).toLocaleDateString('ar-EG') : '--',
          ]),
        ),
      )
      .catch(() => setRows([]))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">إدارة الشركات</h1>
      <ResponsiveDataTable headers={['#', 'الشركة', 'العلامة', 'انتهاء الاشتراك']} rows={rows} />
    </div>
  )
}

