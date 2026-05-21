/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Expense, Category, TrackingViewMode, Currency } from './types';
import { DEFAULT_CATEGORIES, generateSampleExpenses } from './constants';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseCharts } from './components/ExpenseCharts';
import { ExpenseList } from './components/ExpenseList';
import { CURRENCIES, getLocalDateString, getMondayOfDate, getWeekRangeLabel, addDaysToDateString } from './utils';
import { AIAdvisor } from './components/AIAdvisor';
import { Home, Calendar, ChevronLeft, ChevronRight, RefreshCw, BarChart3, HelpCircle, Layers, CreditCard, Sparkles, Coins } from 'lucide-react';

export default function App() {
  // --- INITIAL STATE LOADING WITH LOCAL STORAGE ---

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const stored = localStorage.getItem('house_expenses');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load expenses from localStorage", e);
    }
    // If empty, generate beautiful rich samples so the user instantly sees charts working
    return generateSampleExpenses();
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem('house_categories');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load categories from localStorage", e);
    }
    return DEFAULT_CATEGORIES;
  });

  // --- CURRENCY SELECTION STATE ---
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem('house_currency');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load currency from localStorage", e);
    }
    return { code: 'USD', symbol: '$', name: 'USD (United States Dollar)' };
  });

  // --- INTERVAL CONTROLLER STATE ---

  const [viewMode, setViewMode] = useState<TrackingViewMode>('month');

  // Find range boundaries from current expenses to clamp selectors smartly
  const today = new Date();
  const currentYearStr = today.getFullYear().toString(); // e.g., "2026"
  const currentMonthNumStr = String(today.getMonth() + 1).padStart(2, '0'); // e.g., "05"
  const currentMonthStr = `${currentYearStr}-${currentMonthNumStr}`; // e.g., "2026-05"

  const [selectedDay, setSelectedDay] = useState(() => getLocalDateString()); // e.g., "2026-05-21"
  const [selectedWeek, setSelectedWeek] = useState(() => getMondayOfDate(getLocalDateString())); // Monday of physical week
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  // Sync expenses/categories/currencies changes to local storage
  useEffect(() => {
    localStorage.setItem('house_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('house_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('house_currency', JSON.stringify(currency));
  }, [currency]);

  // --- MUTATION HANDLERS ---

  const handleAddExpense = (newExpData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAllExpenses = () => {
    setExpenses([]);
  };

  const handleLoadSampleData = () => {
    setExpenses(generateSampleExpenses());
  };

  const handleImportExpenses = (imported: Expense[]) => {
    setExpenses(prev => {
      // Avoid raw duplicates if importing twice
      const existedIds = new Set(prev.map(e => e.id));
      const uniqueImported = imported.map((e, idx) => ({
        ...e,
        id: e.id && !existedIds.has(e.id) ? e.id : `imported-${Date.now()}-${idx}`,
      }));
      return [...uniqueImported, ...prev];
    });
  };

  const handleUpdateCategoryBudget = (categoryId: string, budget: number) => {
    setCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return { ...c, budget };
      }
      return c;
    }));
  };

  // --- STEP DATE CONTROLLER LOGIC ---

  const handleStepInterval = (direction: 'prev' | 'next') => {
    if (viewMode === 'days') {
      setSelectedDay(prev => addDaysToDateString(prev, direction === 'prev' ? -1 : 1));
    } else if (viewMode === 'week') {
      setSelectedWeek(prev => addDaysToDateString(prev, direction === 'prev' ? -7 : 7));
    } else if (viewMode === 'month') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      let year = parseInt(yearStr);
      let month = parseInt(monthStr);

      if (direction === 'prev') {
        month--;
        if (month === 0) {
          month = 12;
          year--;
        }
      } else {
        month++;
        if (month === 13) {
          month = 1;
          year++;
        }
      }
      setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
    } else {
      let year = parseInt(selectedYear);
      if (direction === 'prev') {
        year--;
      } else {
        year++;
      }
      setSelectedYear(year.toString());
    }
  };

  const formattedIntervalLabel = useMemo(() => {
    if (viewMode === 'days') {
      const d = new Date(selectedDay);
      return d.toLocaleDateString('en-US', { dateStyle: 'medium' });
    } else if (viewMode === 'week') {
      return getWeekRangeLabel(selectedWeek);
    } else if (viewMode === 'month') {
      const [y, m] = selectedMonth.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${monthNames[parseInt(m) - 1]} ${y}`;
    } else {
      return `Year ${selectedYear}`;
    }
  }, [selectedDay, selectedWeek, selectedMonth, selectedYear, viewMode]);

  return (
    <div className="min-h-screen text-slate-100 pb-16 relative">
      {/* Mesh glow backdrop */}
      <div className="mesh-gradient" />
      
      {/* 1. TOP HEADER & APP STATS RAIL */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-500/25 border border-white/10">
              <Coins size={19} className="stroke-[2.2] animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5 leading-none">
                NestLedger
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 lowercase font-mono">v1.2</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1">Household Wealth Control & Analysis</p>
            </div>
          </div>

          {/* Quick info badges & Currency Selector */}
          <div className="flex items-center gap-6 text-xs text-slate-400">
            {/* Dynamic Currency selection */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono hidden md:inline">Currency</span>
              <select
                id="select-active-currency"
                value={currency.code}
                onChange={(e) => {
                  const found = CURRENCIES.find(c => c.code === e.target.value);
                  if (found) setCurrency(found);
                }}
                className="glass-input text-white py-1.5 px-3 rounded-xl text-xs font-bold focus:outline-none cursor-pointer border border-white/10 focus:ring-1 focus:ring-indigo-500 text-shadow"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-slate-950 text-white font-semibold">
                    {c.symbol} - {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-6 w-px bg-white/10 hidden md:block" />

            <div className="flex-col items-end hidden md:flex">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Ledger Database</span>
              <span className="font-mono font-bold text-white">{expenses.length} Records</span>
            </div>
            
            <div className="h-6 w-px bg-white/10 hidden md:block" />

            <div className="flex-col items-end hidden md:flex">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Secured Connection</span>
              <span className="text-[#a855f7] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Gemini Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN APP CONTAINER AND STEP-CONTROLLER JUMBOTRON */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* TIME INTERVAL SELECTOR PANEL */}
        <div className="glass border border-white/10 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 flex-wrap gap-1">
              <button
                id="btn-viewmode-day"
                onClick={() => setViewMode('days')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'days'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Daily
              </button>
              <button
                id="btn-viewmode-week"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Weekly
              </button>
              <button
                id="btn-viewmode-month"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Monthly
              </button>
              <button
                id="btn-viewmode-year"
                onClick={() => setViewMode('year')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer relative ${
                  viewMode === 'year'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          {/* Stepper with Label */}
          <div className="flex items-center gap-3">
            <button
              id="btn-step-prev"
              onClick={() => handleStepInterval('prev')}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Previous calendar interval"
            >
              <ChevronLeft size={16} className="stroke-[2.5]" />
            </button>

            <div className="min-w-[190px] text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7] block font-mono">Active Target Period</span>
              <span className="text-sm font-extrabold text-white tracking-tight leading-none">
                {formattedIntervalLabel}
              </span>
            </div>

            <button
              id="btn-step-next"
              onClick={() => handleStepInterval('next')}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Next calendar interval"
            >
              <ChevronRight size={16} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Jumper Dropdowns */}
          <div className="flex items-center gap-2">
            {viewMode === 'days' && (
              <input
                id="input-period-day-jumper"
                type="date"
                value={selectedDay}
                onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                className="glass-input text-white py-1.5 px-3 rounded-xl text-xs font-bold focus:outline-none cursor-pointer border border-white/10"
              />
            )}
            {viewMode === 'week' && (
              <input
                id="input-period-week-jumper"
                type="date"
                value={selectedWeek}
                onChange={(e) => e.target.value && setSelectedWeek(getMondayOfDate(e.target.value))}
                className="glass-input text-white py-1.5 px-3 rounded-xl text-xs font-bold focus:outline-none cursor-pointer border border-white/10"
                title="Select a date to focus that week"
              />
            )}
            {viewMode === 'month' && (
              <input
                id="input-period-month-jumper"
                type="month"
                value={selectedMonth}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className="glass-input text-white py-1.5 px-3 rounded-xl text-xs font-bold focus:outline-none cursor-pointer border border-white/10"
              />
            )}
            {viewMode === 'year' && (
              <select
                id="select-period-year-jumper"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="glass-input text-white py-1.5 px-3 rounded-xl text-xs font-bold focus:outline-none cursor-pointer border border-white/10"
              >
                {['2027', '2026', '2025', '2024'].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 3. DUAL COLUMN BENTO CORE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR: Log expenses form */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <ExpenseForm 
              categories={categories}
              onAddExpense={handleAddExpense}
              onUpdateCategoryBudget={handleUpdateCategoryBudget}
              currency={currency}
            />
          </div>

          {/* RIGHT SIDEBAR: Analytical Charts + Grid Records table */}
          <div className="lg:col-span-8 space-y-6">
            <ExpenseCharts 
              expenses={expenses}
              categories={categories}
              selectedDay={selectedDay}
              selectedWeek={selectedWeek}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              viewMode={viewMode}
              currency={currency}
              activeLabel={formattedIntervalLabel}
            />

            <ExpenseList 
              expenses={expenses}
              categories={categories}
              onDeleteExpense={handleDeleteExpense}
              onClearAllExpenses={handleClearAllExpenses}
              onLoadSampleData={handleLoadSampleData}
              onImportExpenses={handleImportExpenses}
              currency={currency}
            />
          </div>

        </div>

      </main>

      {/* Floating AI Advisor Panel */}
      <AIAdvisor 
        expenses={expenses} 
        categories={categories} 
        currencySymbol={currency.symbol} 
      />
    </div>
  );
}
