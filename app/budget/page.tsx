"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBudgetData, updateBudget, addExpense, deleteExpense, getAISpendingInsights, AIInsightCard } from '../actions/budget';

interface ExpenseItem {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
}

interface UserProfile {
  name: string;
  email: string;
  department: string;
  semester: number;
  currentCgpa: number;
}

interface ShortageForecast {
  dailyAverage: number;
  projectedTotal: number;
  projectedShortage: number;
  text: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

const CATEGORY_COLORS: { [key: string]: { bg: string; text: string; fill: string; border: string } } = {
  FOOD: { bg: 'bg-amber-50', text: 'text-amber-700', fill: '#f59e0b', border: 'border-amber-100' },
  TRANSIT: { bg: 'bg-sky-50', text: 'text-sky-700', fill: '#0284c7', border: 'border-sky-100' },
  PRINTING: { bg: 'bg-purple-50', text: 'text-purple-700', fill: '#8b5cf6', border: 'border-purple-100' },
  ACADEMIC: { bg: 'bg-emerald-50', text: 'text-emerald-700', fill: '#10b981', border: 'border-emerald-100' },
  ENTERTAINMENT: { bg: 'bg-rose-50', text: 'text-rose-700', fill: '#f43f5e', border: 'border-rose-100' },
  OTHER: { bg: 'bg-slate-50', text: 'text-slate-700', fill: '#64748b', border: 'border-slate-100' }
};

export default function BudgetPage() {
  const [loading, setLoading] = useState(true);
  const [submittingBudget, setSubmittingBudget] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [insights, setInsights] = useState<AIInsightCard[]>([]);
  const [forecast, setForecast] = useState<ShortageForecast | null>(null);

  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  const [newBudget, setNewBudget] = useState<string>('');
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'FOOD',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const loadData = async (m: number, y: number) => {
    setLoading(true);
    try {
      const budgetRes = await getBudgetData(m, y);
      if (budgetRes && budgetRes.success) {
        setUser(budgetRes.user as unknown as UserProfile);
        setExpenses((budgetRes.expenses || []).map(e => ({
          ...e,
          date: new Date(e.date).toISOString().split('T')[0]
        })));
        const bAmt = budgetRes.budget?.amount || 0;
        setBudgetAmount(bAmt);
        setNewBudget(bAmt > 0 ? bAmt.toString() : '');
      }

      const insightsRes = await getAISpendingInsights(m, y);
      if (insightsRes && insightsRes.success) {
        setInsights(insightsRes.insights || []);
        setForecast(insightsRes.shortageForecast as ShortageForecast);
      }
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newBudget);
    if (isNaN(amt) || amt <= 0) return;
    try {
      setSubmittingBudget(true);
      const res = await updateBudget(amt, currentMonth, currentYear);
      if (res && res.success) {
        setBudgetAmount(amt);
        await loadData(currentMonth, currentYear);
      } else {
        alert(res?.message || "Failed to update budget limit.");
      }
    } catch (error) {
      console.error("Error updating budget:", error);
    } finally {
      setSubmittingBudget(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) return;
    try {
      setSubmittingExpense(true);
      const res = await addExpense({
        amount: amt,
        category: expenseForm.category,
        description: expenseForm.description,
        date: expenseForm.date
      });
      if (res && res.success) {
        setExpenseForm({
          amount: '',
          category: 'FOOD',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        await loadData(currentMonth, currentYear);
      } else {
        alert(res?.message || "Failed to log expense.");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await deleteExpense(id);
      if (res && res.success) {
        await loadData(currentMonth, currentYear);
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = budgetAmount - totalSpent;
  const spentPct = budgetAmount > 0 ? Math.min(100, (totalSpent / budgetAmount) * 100) : 0;

  const categoryTotals: { [key: string]: number } = {
    FOOD: 0,
    TRANSIT: 0,
    PRINTING: 0,
    ACADEMIC: 0,
    ENTERTAINMENT: 0,
    OTHER: 0
  };

  expenses.forEach(e => {
    const cat = e.category.toUpperCase();
    if (categoryTotals[cat] !== undefined) {
      categoryTotals[cat] += e.amount;
    } else {
      categoryTotals['OTHER'] += e.amount;
    }
  });

  const donutData = Object.keys(categoryTotals).map(cat => ({
    name: cat,
    value: categoryTotals[cat],
    color: CATEGORY_COLORS[cat].fill
  })).filter(item => item.value > 0);

  const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0);

  let cumulativePercent = 0;
  const donutSlices = donutData.map((slice) => {
    const percent = slice.value / donutTotal;
    const startX = Math.cos(2 * Math.PI * cumulativePercent);
    const startY = Math.sin(2 * Math.PI * cumulativePercent);
    cumulativePercent += percent;
    const endX = Math.cos(2 * Math.PI * cumulativePercent);
    const endY = Math.sin(2 * Math.PI * cumulativePercent);
    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const r = 35;
    const x1 = 50 + r * startX;
    const y1 = 50 + r * startY;
    const x2 = 50 + r * endX;
    const y2 = 50 + r * endY;

    return {
      path: `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      color: slice.color,
      name: slice.name,
      value: slice.value,
      pct: (percent * 100).toFixed(1)
    };
  });

  if (loading && expenses.length === 0 && !user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-indigo-600 animate-ping"></div>
          <p className="text-gray-500 font-bold text-sm">Loading AI Budget Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200/60 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
              💰
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Smart Student Budget & Expense Tracker</h1>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">AI-Powered Campus Ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="bg-white border border-gray-200 text-gray-800 text-xs font-bold px-3 py-2.5 rounded-xl outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString(undefined, { month: 'long' })}
                </option>
              ))}
            </select>
            
            <Link href="/dashboard" className="bg-[#0f172a] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-gray-800 transition shadow-sm ml-auto sm:ml-0">
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* AI Forecast Banner */}
        {forecast && (
          <div className={`p-5 rounded-3xl shadow-sm border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition ${
            forecast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
            forecast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
            forecast.type === 'danger' ? 'bg-red-50 border-red-200 text-red-900' :
            'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-start gap-4">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider">AI Spending & Shortage Forecast</h3>
                <p className="text-xs font-semibold mt-1 leading-relaxed">{forecast.text}</p>
              </div>
            </div>
            {forecast.projectedShortage > 0 && (
              <div className="bg-red-600 text-white font-extrabold text-[11px] px-4 py-2 rounded-2xl shrink-0 shadow-sm border border-red-400">
                Proj. Shortage: Tk {forecast.projectedShortage.toFixed(0)}
              </div>
            )}
          </div>
        )}

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Monthly Budget</p>
              <h2 className="text-3xl font-black text-gray-900 mt-2">Tk {budgetAmount.toFixed(2)}</h2>
            </div>
            
            <form onSubmit={handleUpdateBudget} className="mt-6 flex items-center gap-2">
              <input
                type="number"
                placeholder="Set budget limit..."
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={submittingBudget}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                {submittingBudget ? "..." : "Set"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Spent So Far</p>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {spentPct.toFixed(0)}% Used
                </span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 mt-2">Tk {totalSpent.toFixed(2)}</h2>
            </div>

            <div className="mt-6 space-y-1">
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${spentPct > 90 ? 'bg-red-500' : spentPct > 70 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                  style={{ width: `${spentPct}%` }}
                ></div>
              </div>
              <p className="text-[9px] font-bold text-gray-400 text-right">Target: Under limit</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remaining Balance</p>
              <h2 className={`text-3xl font-black mt-2 ${remainingBudget < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                Tk {remainingBudget.toFixed(2)}
              </h2>
            </div>
            
            <div className="mt-6 text-xs font-semibold text-gray-500 flex justify-between items-center">
              <span>Avg Daily Spend:</span>
              <strong className="text-gray-900">Tk {forecast?.dailyAverage.toFixed(2) || '0.00'}</strong>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Log New Expense</h3>
                <p className="text-xs text-gray-400 mt-0.5">Quickly ledger your daily expenditures.</p>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Amount (Tk)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="FOOD">Food & Snacks</option>
                      <option value="TRANSIT">Transit/Commute</option>
                      <option value="PRINTING">Academic Printing</option>
                      <option value="ACADEMIC">Academic/Books</option>
                      <option value="ENTERTAINMENT">Entertainment</option>
                      <option value="OTHER">Other/Misc</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Lunch at cafeteria, photocopy"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="w-full bg-[#0f172a] text-white font-bold py-3 rounded-xl text-xs hover:bg-gray-800 transition disabled:opacity-50 mt-2 shadow-md cursor-pointer"
                >
                  {submittingExpense ? "Logging..." : "+ Log Expense"}
                </button>
              </form>
            </div>

            {user && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 text-xs font-semibold text-indigo-900 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">Student Context</p>
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-bold text-indigo-950">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Department:</span>
                  <span className="font-bold text-indigo-950">{user.department}</span>
                </div>
                <div className="flex justify-between">
                  <span>Semester / CGPA:</span>
                  <span className="font-bold text-indigo-950">Sem {user.semester} / {user.currentCgpa.toFixed(2)} CGPA</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            
            {/* Category Breakdown Donut Chart */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between items-center text-center">
              <div className="w-full text-left mb-4">
                <h3 className="font-bold text-gray-900 text-sm">Category Breakdown</h3>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Distribution of current month expenses.</p>
              </div>

              {donutTotal === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs font-semibold text-gray-400 border border-dashed border-gray-200 rounded-2xl w-full">
                  No data to chart. Add expenses to generate.
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      {donutSlices.map((slice, index) => (
                        <path
                          key={index}
                          d={slice.path}
                          fill={slice.color}
                          className="transition-all hover:opacity-85 duration-350 cursor-pointer"
                        />
                      ))}
                      <circle cx="50" cy="50" r="18" fill="white" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                      <span className="text-xs font-black text-gray-900 mt-0.5">Tk {donutTotal.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold w-full text-left mt-2">
                    {donutData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="text-gray-500 truncate">{item.name}:</span>
                        <span className="text-gray-900 ml-auto">Tk {item.value.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Insights Section */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
                <span>🤖</span> AI Savings & Academic Insights
              </h3>

              {insights.length === 0 ? (
                <div className="text-center py-6 text-xs font-semibold text-gray-400">
                  No insights generated. Log some expenses to trigger AI evaluations.
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs font-medium flex gap-3 ${
                        insight.type === 'success' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' :
                        insight.type === 'warning' ? 'bg-amber-50/50 border-amber-100 text-amber-900' :
                        insight.type === 'danger' ? 'bg-rose-50/50 border-rose-100 text-rose-900' :
                        'bg-slate-50 border-slate-100 text-slate-900'
                      }`}
                    >
                      <span className="text-xl shrink-0">{insight.icon}</span>
                      <div>
                        <h4 className="font-black mb-1">{insight.title}</h4>
                        <p className="leading-relaxed opacity-90">{insight.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense Ledger Table */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Expense Ledger</h3>
                  <p className="text-xs text-gray-400 mt-0.5">History of expenses logged this month.</p>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {expenses.length} Records
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                  <p className="text-sm font-semibold text-gray-400">No expenses recorded yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Use the quick log form to record your first student expense.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 font-extrabold">Date</th>
                        <th className="pb-3 font-extrabold">Category</th>
                        <th className="pb-3 font-extrabold">Description</th>
                        <th className="pb-3 font-extrabold text-right">Amount</th>
                        <th className="pb-3 font-extrabold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {expenses.map((expense) => {
                        const style = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['OTHER'];
                        return (
                          <tr key={expense.id} className="hover:bg-gray-50/50 transition">
                            <td className="py-3.5 font-semibold text-gray-500 whitespace-nowrap">
                              {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                                {expense.category}
                              </span>
                            </td>
                            <td className="py-3.5 text-gray-600 font-semibold max-w-xs truncate">
                              {expense.description || <span className="text-gray-300 italic">No description</span>}
                            </td>
                            <td className="py-3.5 font-black text-right text-gray-900">
                              Tk {expense.amount.toFixed(2)}
                            </td>
                            <td className="py-3.5 text-center">
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-xl transition cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      <footer className="max-w-7xl mx-auto w-full pt-8 mt-8 border-t border-gray-200/60 text-center text-xs font-semibold text-gray-400">
        © {new Date().getFullYear()} UniVerse Student Ledger. Powered by AI.
      </footer>
    </div>
  );
}