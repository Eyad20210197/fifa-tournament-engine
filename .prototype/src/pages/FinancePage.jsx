import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { usePrototypeStore } from '../store/prototypeStore'
import AppIcon from '../components/common/AppIcon'
import ShinyText from '../components/reactbits/ShinyText'
import SpotlightCard from '../components/reactbits/SpotlightCard'

export default function FinancePage() {
  const { t, language } = useLanguage()
  const financials = usePrototypeStore((s) => s.financials)
  const addExpense = usePrototypeStore((s) => s.addExpense)
  const deleteExpense = usePrototypeStore((s) => s.deleteExpense)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [notice, setNotice] = useState('')

  const totalRevenue = (financials.entry_fee || 0) * (financials.expected_teams || 8) + (financials.sponsor_amount || 0)
  const totalExpenses = financials.expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0

  function handleAddExpense(e) {
    e.preventDefault()
    if (!title.trim() || !amount) return
    addExpense({ title: title.trim(), amount: Number(amount) })
    setTitle('')
    setAmount('')
    setNotice(language === 'ar' ? 'تم تسجيل المصروف بنجاح!' : 'Expense recorded!')
    setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <SpotlightCard className="border border-white/10 bg-slate-950/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-400/40 bg-teal-500/20 text-teal-400">
            <AppIcon name="dollar" size={22} />
          </div>
          <div>
            <ShinyText text={t('navFinance')} className="text-xl font-black text-white" />
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'الإيرادات، رسوم الاشتراك، الرعاية، المصروفات، وصافي الأرباح' : 'Tournament revenues, entry fees, operational costs, and profit breakdown'}
            </p>
          </div>
        </div>
      </SpotlightCard>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-bold text-emerald-200">
          <AppIcon name="check" size={16} className="text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard className="border border-emerald-500/30 p-5">
          <span className="text-xs text-slate-400">{t('totalRevenue')}</span>
          <p className="mt-2 text-2xl font-black text-emerald-400 font-mono">{totalRevenue.toLocaleString()} EGP</p>
        </SpotlightCard>

        <SpotlightCard className="border border-rose-500/30 p-5">
          <span className="text-xs text-slate-400">{t('totalExpenses')}</span>
          <p className="mt-2 text-2xl font-black text-rose-400 font-mono">{totalExpenses.toLocaleString()} EGP</p>
        </SpotlightCard>

        <SpotlightCard className="border border-sky-500/30 p-5">
          <span className="text-xs text-slate-400">{t('netRevenue')}</span>
          <p className="mt-2 text-2xl font-black text-sky-400 font-mono">{netProfit.toLocaleString()} EGP</p>
        </SpotlightCard>

        <SpotlightCard className="border border-amber-500/30 p-5">
          <span className="text-xs text-slate-400">{t('profitMargin')}</span>
          <p className="mt-2 text-2xl font-black text-amber-400 font-mono">{profitMargin}%</p>
        </SpotlightCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add Expense Form */}
        <SpotlightCard className="border border-white/10 p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <AppIcon name="plus" size={16} />
            <span>{language === 'ar' ? 'إضافة بند مصروف جديد' : 'Log New Expense'}</span>
          </h3>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'بند المصروف' : 'Expense Description'}
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                placeholder={language === 'ar' ? 'مشروبات، حكام، صيانة أذرع...' : 'e.g. Referee compensation, snacks'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">
                {language === 'ar' ? 'المبلغ (ج.م)' : 'Amount (EGP)'}
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-6 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition"
            >
              <AppIcon name="plus" size={14} />
              <span>{language === 'ar' ? 'تسجيل المصروف' : 'Add Expense'}</span>
            </button>
          </form>
        </SpotlightCard>

        {/* Expenses Ledger */}
        <SpotlightCard className="border border-white/10 p-0 overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {language === 'ar' ? 'سجل المصروفات' : 'Expenses Ledger'} ({financials.expenses.length})
            </h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full text-xs text-left">
              <thead className="border-b border-white/10 bg-slate-900/80 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">{language === 'ar' ? 'البند' : 'Item'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {financials.expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white">{item.title}</td>
                    <td className="px-4 py-3 text-rose-300 font-mono font-bold">{item.amount?.toLocaleString()} EGP</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteExpense(item.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <AppIcon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpotlightCard>
      </div>
    </div>
  )
}
