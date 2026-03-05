import { Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useAuth } from '../../auth/useAuth'
import AppSidebar from '../../components/layout/AppSidebar'
import AppTopbar from '../../components/layout/AppTopbar'
import { ROLES } from '../../auth/roles'

const roleLabels = {
  [ROLES.SUPER_ADMIN]: 'مشرف المنصة',
  [ROLES.ADMIN]: 'مدير النشاط',
  [ROLES.STAFF]: 'طاقم التشغيل',
}

const navByRole = {
  [ROLES.SUPER_ADMIN]: [
    { to: '/saas', label: 'لوحة إحصائيات عامة', icon: '📊' },
    { to: '/saas/accounts', label: 'إدارة الحسابات', icon: '👤' },
    { to: '/saas/businesses', label: 'إدارة الأنشطة التجارية', icon: '🏢' },
    { to: '/saas/subscriptions', label: 'تفعيل الاشتراكات', icon: '🧾' },
    { to: '/saas/users', label: 'إدارة المستخدمين', icon: '👥' },
    { to: '/saas/finance', label: 'الإدارة المالية', icon: '💰' },
    { to: '/display', label: 'شاشة العرض', icon: '📺' },
  ],
  [ROLES.ADMIN]: [
    { to: '/saas', label: 'لوحة التحكم', icon: '📊' },
    { to: '/saas/schedule', label: 'إدارة البطولات', icon: '🏆' },
    { to: '/saas/device-runtime', label: 'تشغيل الأجهزة', icon: '🕹️' },
    { to: '/saas/finance', label: 'الإدارة المالية', icon: '💰' },
    { to: '/saas/branding', label: 'تخصيص الهوية', icon: '🎨' },
    { to: '/saas/subscription-status', label: 'حالة الاشتراك', icon: '✅' },
    { to: '/display', label: 'شاشة العرض', icon: '📺' },
  ],
  [ROLES.STAFF]: [
    { to: '/saas/tournaments', label: 'المباريات', icon: '⚽' },
    { to: '/control', label: 'التحكم بالمباراة', icon: '🎮' },
    { to: '/display', label: 'شاشة العرض', icon: '📺' },
    { to: '/saas/schedule', label: 'عرض الجدول', icon: '📋' },
  ],
}

const routeTitles = [
  { startsWith: '/saas/businesses', title: 'إدارة الأنشطة التجارية', subtitle: 'استعراض الأنشطة والهوية وتواريخ الاشتراك' },
  { startsWith: '/saas/accounts', title: 'إدارة الحسابات', subtitle: 'إدارة حسابات المنصة والصلاحيات العامة' },
  { startsWith: '/saas/subscriptions', title: 'تفعيل الاشتراكات', subtitle: 'متابعة الاشتراكات وتجديدها' },
  { startsWith: '/saas/tournaments', title: 'المباريات', subtitle: 'قائمة البطولات والمباريات المرتبطة بها' },
  { startsWith: '/saas/schedule', title: 'إدارة البطولات', subtitle: 'إدارة البطولة كاملة: إنشاء، تعديل، حالة، فرق، جدول، ورعاية وتمويل' },
  { startsWith: '/saas/device-runtime', title: 'تشغيل الأجهزة', subtitle: 'تتبع أوقات تشغيل أجهزة البلايستيشن لكل يوم وإجمالي التشغيل' },
  { startsWith: '/saas/finance', title: 'الإدارة المالية', subtitle: 'ملخص الإيرادات والمصروفات وصافي الربح' },
  { startsWith: '/saas/users', title: 'إدارة المستخدمين', subtitle: 'مراقبة حسابات الطاقم والأدوار' },
  { startsWith: '/saas/branding', title: 'تخصيص الهوية', subtitle: 'تعديل العلامة والألوان والشعار' },
  { startsWith: '/saas/subscription-status', title: 'حالة الاشتراك', subtitle: 'متابعة الحالة الحالية للاشتراك' },
  { startsWith: '/control', title: 'التحكم بالمباراة', subtitle: 'إدارة البث المباشر وتحديث النتيجة' },
  { startsWith: '/display', title: 'شاشة العرض', subtitle: 'عرض سينمائي حي للجمهور' },
  { startsWith: '/saas', title: 'لوحة التحكم', subtitle: 'ملخص الأداء وحالة النظام' },
]

export default function DashboardLayout() {
  const location = useLocation()
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const { user, role, logout, branding } = useAuth()

  const navItems = useMemo(() => navByRole[role] || [], [role])
  const heading = useMemo(() => {
    return routeTitles.find((item) => location.pathname.startsWith(item.startsWith)) || routeTitles[routeTitles.length - 1]
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-[var(--background-dark)] text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-3 md:px-5 md:py-5">
        <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_290px]">
          <section className="order-2 min-w-0 md:order-1">
            <AppTopbar
              title={heading.title}
              subtitle={heading.subtitle}
              brandName={branding?.brand_name}
              logoUrl={branding?.logo_url}
              onToggleSidebar={toggleSidebar}
            />
            <main className="min-w-0 rounded-3xl border border-white/10 bg-[var(--surface-card)]/65 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.22)] md:p-5">
              <Outlet />
            </main>
          </section>

          <section className="order-1 hidden h-[calc(100vh-2rem)] sticky top-4 md:order-2 md:block">
            <AppSidebar
              items={navItems}
              userName={user?.username}
              roleLabel={roleLabels[role] || '--'}
              onNavigate={() => setSidebarOpen(false)}
              onLogout={() => logout({ redirect: true })}
            />
          </section>

          {sidebarOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/65 md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="إغلاق القائمة"
              />
              <section className="fixed right-2 top-2 z-50 h-[calc(100vh-1rem)] w-[min(88vw,320px)] md:hidden">
                <AppSidebar
                  items={navItems}
                  userName={user?.username}
                  roleLabel={roleLabels[role] || '--'}
                  onNavigate={() => setSidebarOpen(false)}
                  onLogout={() => logout({ redirect: true })}
                />
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
