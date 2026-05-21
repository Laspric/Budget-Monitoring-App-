/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, Category, Currency } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { Plus, Check, Calendar, ShieldAlert, CreditCard, Layers, Tag as TagIcon, Sparkles } from 'lucide-react';

interface ExpenseFormProps {
  categories: Category[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateCategoryBudget: (categoryId: string, budget: number) => void;
  currency: Currency;
}

export function ExpenseForm({
  categories,
  onAddExpense,
  onUpdateCategoryBudget,
  currency,
}: ExpenseFormProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'budget'>('expense');

  // Expense form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || '');
  const [date, setDate] = useState(() => {
    // Current UTC/Local Date parsed safely
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'other'>('card');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Budget form state
  const [budgetLimits, setBudgetLimits] = useState<Record<string, string>>({});

  useEffect(() => {
    const limits: Record<string, string> = {};
    categories.forEach(c => {
      limits[c.id] = c.budget ? c.budget.toString() : '';
    });
    setBudgetLimits(limits);
  }, [categories]);

  const [budgetSuccessMsg, setBudgetSuccessMsg] = useState('');

  // Handle addition
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    onAddExpense({
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      date,
      category,
      description: description.trim() || `${categories.find(c => c.id === category)?.name || 'House'} Spend`,
      payee: payee.trim() || 'Unspecified Vendor',
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    // Reset fields smartly
    setAmount('');
    setDescription('');
    setPayee('');
    setNotes('');
    
    setSuccessMsg('Expense logged successfully!');
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  const handleBudgetChange = (catId: string, val: string) => {
    if (val === '' || /^\d*$/.test(val)) {
      setBudgetLimits(prev => ({ ...prev, [catId]: val }));
    }
  };

  const handleSaveBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    Object.keys(budgetLimits).forEach((catId) => {
      const val = budgetLimits[catId];
      const budgetNum = val === '' ? 0 : parseInt(val);
      onUpdateCategoryBudget(catId, budgetNum);
    });

    setBudgetSuccessMsg('Monthly category budgets updated!');
    setTimeout(() => {
      setBudgetSuccessMsg('');
    }, 3500);
  };

  return (
    <div className="glass rounded-3xl border border-white/10 overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="flex border-b border-white/10 bg-white/5 p-1.5">
        <button
          id="tab-add-expense"
          onClick={() => setActiveTab('expense')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'expense'
              ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Plus size={14} className="stroke-[2.5]" />
          Record Expense
        </button>
        <button
          id="tab-edit-budgets"
          onClick={() => setActiveTab('budget')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'budget'
              ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={14} className="stroke-[2.5]" />
          Budget Limits
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between">
        {activeTab === 'expense' ? (
          <form onSubmit={handleSubmitExpense} className="space-y-4 flex flex-col h-full justify-between">
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-dashed border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">Daily Household Ledger</p>
                <h3 className="text-lg font-extrabold text-white leading-snug">Log New House Spend</h3>
              </div>

              {/* Amount input in bold premium style */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount Spend ({currency.code})</label>
                <div className="relative rounded-xl overflow-hidden shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-450 font-extrabold text-sm font-mono">
                    {currency.symbol}
                  </div>
                  <input
                    id="input-expense-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="block w-full border border-white/10 bg-white/5 py-3.5 pl-10 pr-3 text-white text-lg font-bold font-mono focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all rounded-xl placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Date and Category grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Receipt Date</label>
                  <div className="relative">
                    <Calendar size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="input-expense-date"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-slice text-xs text-white font-medium focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">House Category</label>
                  <div className="relative">
                    <TagIcon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      id="input-expense-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-xs text-white font-medium focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white font-semibold">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payee and Description */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Merchant / Payee</label>
                  <input
                    id="input-expense-payee"
                    type="text"
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    placeholder="e.g. Walmart, City Power"
                    className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Expense Description</label>
                  <input
                    id="input-expense-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Weekly milk, groceries"
                    className="block w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Payment Method / Mode split */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = paymentMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value as any)}
                        className={`py-2 text-[10px] sm:text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {method.label.split(' ')[0]} {/* Shorter labels */}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Optional Notes</label>
                <textarea
                  id="input-expense-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record warrant details, check numbers or comments..."
                  rows={2}
                  className="block w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-slate-500 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button
                id="btn-submit-expense"
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 animate-shadow-pulse"
              >
                <Check size={14} className="stroke-[2.5]" />
                Record Transaction
              </button>

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded-lg text-xs font-medium text-center animate-fade-in">
                  {successMsg}
                </div>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveBudgets} className="space-y-4 flex flex-col h-full justify-between">
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-dashed border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">Control Panel</span>
                <h3 className="text-lg font-extrabold text-white leading-snug">Adjust Monthly Budgets</h3>
                <p className="text-xs text-slate-400 mt-1">Configure continuous monthly limit targets for automatic indicators</p>
              </div>

              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between gap-4 p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs font-semibold text-slate-200 truncate">{cat.name}</span>
                    </div>
                    
                    <div className="relative rounded-lg w-28 overflow-hidden">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 text-[10px] font-bold font-mono">
                        {currency.symbol}
                      </div>
                      <input
                        type="text"
                        value={budgetLimits[cat.id] || ''}
                        onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                        placeholder="Unlimited"
                        className="block w-full border border-white/10 bg-white/5 py-1.5 pl-5 pr-2 text-xs font-bold text-white text-right focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono rounded-lg placeholder-slate-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button
                id="btn-save-budgets"
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/25"
              >
                <Check size={14} className="stroke-[2.5]" />
                Apply Budgets
              </button>

              {budgetSuccessMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded-lg text-xs font-medium text-center animate-fade-in">
                  {budgetSuccessMsg}
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
