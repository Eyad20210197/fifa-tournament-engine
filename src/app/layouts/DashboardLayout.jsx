import { Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'
import AppSidebar from '../../components/layout/AppSidebar'
import AppTopbar from '../../components/layout/AppTopbar'
import { ROLES } from '../../auth/roles'

export default function DashboardLayout() {
  const location = useLocation()
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const { user, role, logout, branding } = useAuth()
  const { t, isRtl, language } = useLanguage()

  const roleLabels = {
    [ROLES.SUPER_ADMIN]: t('roleSuperAdmin'),
    [ROLES.ADMIN]: t('roleAdmin'),
    [ROLES.STAFF]: t('roleStaff'),
  }

  const navByRole = {
    [ROLES.SUPER_ADMIN]: [
      { to: '/saas', label: t('navDashboard'), icon: 'chart' },
      { to: '/saas/accounts', label: t('navAccounts'), icon: 'user' },
      { to: '/saas/businesses', label: t('navBusinesses'), icon: 'building' },
      { to: '/saas/subscriptions', label: t('navSubscriptionsAdmin'), icon: 'receipt' },
      { to: '/saas/users', label: t('navUsers'), icon: 'users' },
      { to: '/saas/finance', label: t('navFinance'), icon: 'dollar' },
      { to: '/display', label: t('navDisplay'), icon: 'display' },
    ],
    [ROLES.ADMIN]: [
      { to: '/saas', label: t('navDashboard'), icon: 'chart' },
      { to: '/saas/schedule', label: t('navSchedule'), icon: 'trophy' },
      { to: '/saas/device-runtime', label: t('navStations'), icon: 'gamepad' },
      { to: '/saas/finance', label: t('navFinance'), icon: 'dollar' },
      { to: '/saas/branding', label: t('navBranding'), icon: 'palette' },
      { to: '/saas/subscription-status', label: t('navSubscription'), icon: 'check' },
      { to: '/display', label: t('navDisplay'), icon: 'display' },
    ],
    [ROLES.STAFF]: [
      { to: '/saas/tournaments', label: t('navTournaments'), icon: 'soccer' },
      { to: '/control', label: t('navControl'), icon: 'gamepad' },
      { to: '/display', label: t('navDisplay'), icon: 'display' },
      { to: '/saas/schedule', label: t('navSchedule'), icon: 'calendar' },
    ],
  }

  const routeTitles = [
    { startsWith: '/saas/businesses', title: t('navBusinesses'), subtitle: language === 'ar' ? 'استعراض الأنشطة والهوية وتواريخ الاشتراك' : 'Manage venues, branding, and active subscriptions' },
    { startsWith: '/saas/accounts', title: t('navAccounts'), subtitle: language === 'ar' ? 'إدارة حسابات المنصة والصلاحيات العامة' : 'Platform master accounts and permission controls' },
    { startsWith: '/saas/subscriptions', title: t('navSubscriptionsAdmin'), subtitle: language === 'ar' ? 'متابعة الاشتراكات وتجديدها' : 'Manage and renew venue licenses' },
    { startsWith: '/saas/tournaments', title: t('navTournaments'), subtitle: language === 'ar' ? 'قائمة البطولات والمباريات المرتبطة بها' : 'Championship fixtures and live matches' },
    { startsWith: '/saas/schedule', title: t('navSchedule'), subtitle: language === 'ar' ? 'إدارة البطولات، المعايرة، الجداول، والتمويل' : 'Tournament wizard, smart calibration, teams and schedules' },
    { startsWith: '/saas/device-runtime', title: t('navStations'), subtitle: language === 'ar' ? 'تتبع أوقات تشغيل أجهزة البلايستيشن والإيراد' : 'PlayStation session timers and hourly billing' },
    { startsWith: '/saas/finance', title: t('navFinance'), subtitle: language === 'ar' ? 'ملخص الإيرادات والمصروفات وصافي الربح' : 'Revenue, expenses, sponsor income, and net profit' },
    { startsWith: '/saas/users', title: t('navUsers'), subtitle: language === 'ar' ? 'مراقبة حسابات الطاقم والأدوار' : 'Staff accounts and referee credentials' },
    { startsWith: '/saas/branding', title: t('navBranding'), subtitle: language === 'ar' ? 'تعديل العلامة والألوان والشعار' : 'Custom theme, colors, and animated logos' },
    { startsWith: '/saas/subscription-status', title: t('navSubscription'), subtitle: language === 'ar' ? 'متابعة الحالة الحالية للاشتراك' : 'Active subscription plan status' },
    { startsWith: '/control', title: t('navControl'), subtitle: language === 'ar' ? 'إدارة البث المباشر وتحديث النتيجة' : 'Live match scorekeeper and referee broadcast console' },
    { startsWith: '/display', title: t('navDisplay'), subtitle: language === 'ar' ? 'عرض سينمائي حي للجمهور' : 'Cinematic spectator screen for arena displays' },
    { startsWith: '/saas', title: t('navDashboard'), subtitle: language === 'ar' ? 'ملخص الأداء وحالة الصالة' : 'Arena overview, live tournaments, and quick KPIs' },
  ]

  const navItems = useMemo(() => navByRole[role] || [], [role, language])
  const heading = useMemo(() => {
    return routeTitles.find((item) => location.pathname.startsWith(item.startsWith)) || routeTitles[routeTitles.length - 1]
  }, [location.pathname, language])

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-[1800px] px-3 py-3 md:px-5 md:py-5">
        <div className={`relative grid gap-4 ${isRtl ? 'md:grid-cols-[minmax(0,1fr)_280px]' : 'md:grid-cols-[280px_minmax(0,1fr)]'}`}>
          {/* Main Content Area */}
          <section className={`min-w-0 ${isRtl ? 'order-2 md:order-1' : 'order-2 md:order-2'}`}>
            <AppTopbar
              title={heading.title}
              subtitle={heading.subtitle}
              brandName={branding?.brand_name}
              logoUrl={branding?.logo_url}
              onToggleSidebar={toggleSidebar}
            />
            <main className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 shadow-[0_14px_45px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-6">
              <Outlet />
            </main>
          </section>

          {/* Desktop Sidebar */}
          <section className={`hidden h-[calc(100vh-2.5rem)] sticky top-4 md:block ${isRtl ? 'order-1 md:order-2' : 'order-1 md:order-1'}`}>
            <AppSidebar
              items={navItems}
              userName={user?.username}
              roleLabel={roleLabels[role] || '--'}
              onNavigate={() => setSidebarOpen(false)}
              onLogout={() => logout({ redirect: true })}
            />
          </section>

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close Menu"
              />
              <section className={`fixed top-2 z-50 h-[calc(100vh-1rem)] w-[min(88vw,320px)] md:hidden ${isRtl ? 'right-2' : 'left-2'}`}>
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
