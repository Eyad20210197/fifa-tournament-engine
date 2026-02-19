import { useAuth } from '../../auth/useAuth'

export default function SubscriptionStatusPage() {
  const { subscriptionExpired } = useAuth()

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-[var(--text-secondary)]">حالة الاشتراك الحالية</p>
        <p className={[
          'mt-2 text-2xl font-semibold',
          subscriptionExpired ? 'text-rose-300' : 'text-emerald-300',
        ].join(' ')}>
          {subscriptionExpired ? 'منتهي' : 'نشط'}
        </p>
      </article>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
        عند انتهاء الاشتراك يتم إيقاف الوصول تلقائيا مع رسالة واضحة في صفحة التوثيق.
      </div>
    </section>
  )
}
