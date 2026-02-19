import { useAuth } from '../../auth/useAuth'

export default function LockedPage() {
  const { logout } = useAuth()

  return (
    <div className="grid min-h-[50vh] place-items-center rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold text-amber-100">الاشتراك منتهي</h1>
        <p className="mt-2 text-sm text-amber-200/80">تم إيقاف الوصول حتى تجديد الاشتراك.</p>
        <button
          className="mt-4 min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-[#2d1e00]"
          onClick={() => logout({ redirect: true })}
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
