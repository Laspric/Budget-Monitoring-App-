/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Expense, Category } from '../types';
import { PAYMENT_METHODS } from '../constants';
import { 
  Search, Trash2, Calendar, CreditCard, ChevronLeft, ChevronRight, 
  Download, Upload, RefreshCw, X, SlidersHorizontal, ListFilter, AlertCircle
} from 'lucide-react';

import { Currency } from '../types';
import { formatCurrency } from '../utils';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  onDeleteExpense: (id: string) => void;
  onClearAllExpenses: () => void;
  onLoadSampleData: () => void;
  onImportExpenses: (imported: Expense[]) => void;
  currency: Currency;
}

export function ExpenseList({
  expenses,
  categories,
  onDeleteExpense,
  onClearAllExpenses,
  onLoadSampleData,
  onImportExpenses,
  currency,
}: ExpenseListProps) {
  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter Toggle Dialog
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Success error feedback lines
  const [alertMsg, setAlertMsg] = useState('');

  const triggerFeedback = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => {
      setAlertMsg('');
    }, 4000);
  };

  // Parse file imports
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // Validate
          const validExpenses = data.filter(item => 
            item.amount && item.date && item.category && item.description
          ) as Expense[];
          
          if (validExpenses.length > 0) {
            onImportExpenses(validExpenses);
            triggerFeedback(`Imported ${validExpenses.length} records safely!`);
          } else {
            triggerFeedback("No valid records found in file.");
          }
        } else {
          triggerFeedback("Invalid format. Must be a JSON array.");
        }
      } catch (err) {
        triggerFeedback("Failed to parse JSON backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Export data as JSON file download
  const handleExportData = () => {
    if (expenses.length === 0) {
      triggerFeedback("No records to export!");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expenses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `house_expenses_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerFeedback("Backup downloaded successfully!");
  };

  // --- FILTER & SORT LOGIC ---

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          e.description.toLowerCase().includes(searchLower) ||
          e.payee.toLowerCase().includes(searchLower) ||
          (e.notes || '').toLowerCase().includes(searchLower);

        const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
        const matchesMethod = selectedMethod === 'all' || e.paymentMethod === selectedMethod;

        const eTime = new Date(e.date).getTime();
        const matchesStartDate = !startDate || eTime >= new Date(startDate).getTime();
        const matchesEndDate = !endDate || eTime <= new Date(endDate).getTime();

        return matchesSearch && matchesCategory && matchesMethod && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortBy === 'date-asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === 'amount-desc') {
          return b.amount - a.amount;
        } else if (sortBy === 'amount-asc') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [expenses, search, selectedCategory, selectedMethod, startDate, endDate, sortBy]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const startIndex = (page - 1) * itemsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpenses, currentPage, totalPages]);

  const catMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedMethod('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div id="expenses-ledger-pane" className="glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between">
      
      {/* Search and control bar */}
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Household Expense Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Filter, organize, and perform database audits on your home transactions</p>
          </div>

          {/* Backup, Load sample, and Clear items */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportData}
              title="Download backup file"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all"
            >
              <Download size={13} />
              Backup
            </button>
            
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all">
              <Upload size={13} />
              Restore
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {expenses.length === 0 ? (
              <button
                onClick={onLoadSampleData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/20 cursor-pointer transition-all"
              >
                <RefreshCw size={12} className="shrink-0" />
                Load Samples
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete all stored transaction records? This action cannot be undone.")) {
                    onClearAllExpenses();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 cursor-pointer transition-all"
              >
                <Trash2 size={13} />
                Clear All
              </button>
            )}
          </div>
        </div>

        {alertMsg && (
          <div className="mt-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 p-2.5 rounded-xl text-xs font-semibold text-center animate-fade-in">
            {alertMsg}
          </div>
        )}

        {/* Real-time search form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-5">
          <div className="sm:col-span-6 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="ledger-search-box"
              type="text"
              placeholder="Search by description, merchant, or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white/5 border border-white/10 text-white text-xs py-2.5 pl-10 pr-9 rounded-xl focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-500"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white/5 border border-white/10 text-slate-200 text-xs py-2.5 px-3 rounded-xl focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
            >
              <option value="all" className="bg-slate-900 text-white">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 text-slate-200 text-xs py-2.5 px-3 rounded-xl focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="date-desc" className="bg-slate-900 text-white">Newest Date</option>
              <option value="date-asc" className="bg-slate-900 text-white">Oldest Date</option>
              <option value="amount-desc" className="bg-slate-900 text-white">Amount: High-Low</option>
              <option value="amount-asc" className="bg-slate-900 text-white">Amount: Low-High</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                showAdvancedFilters || startDate || endDate || selectedMethod !== 'all'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Advanced filter panels */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Payment Channel</label>
              <select
                value={selectedMethod}
                onChange={(e) => {
                  setSelectedMethod(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-900/60 border border-white/10 text-white text-xs py-2 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                <option value="all">All Payment Types</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Start Date Range</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-900/60 border border-white/10 text-white text-xs py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">End Date Range</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-900/60 border border-white/10 text-white text-xs py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        )}

        {/* Filter State Badges */}
        {(selectedCategory !== 'all' || selectedMethod !== 'all' || startDate || endDate || search) && (
          <div className="flex flex-wrap gap-1.5 mt-4 items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1.5 font-mono">Active Filters:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold">
                Cat: {catMap.get(selectedCategory)?.name}
                <X size={10} className="cursor-pointer ml-1 hover:text-white" onClick={() => setSelectedCategory('all')} />
              </span>
            )}
            {selectedMethod !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold">
                Method: {PAYMENT_METHODS.find(m => m.value === selectedMethod)?.label.split(' ')[0]}
                <X size={10} className="cursor-pointer ml-1 hover:text-white" onClick={() => setSelectedMethod('all')} />
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold">
                Date: {startDate || '*'} to {endDate || '*'}
                <X size={10} className="cursor-pointer ml-1 hover:text-white" onClick={() => { setStartDate(''); setEndDate(''); }} />
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold">
                Keyword: "{search}"
                <X size={10} className="cursor-pointer ml-1 hover:text-white" onClick={() => setSearch('')} />
              </span>
            )}
            <button 
              onClick={resetFilters}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold ml-1.5 flex items-center gap-0.5 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Ledger Table Section */}
      <div className="flex-1 overflow-x-auto min-h-[350px]">
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <AlertCircle size={32} className="text-slate-500 mb-2 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-white">No matching transactions</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Modify filters or choose sorting rules to locate historical records, or log a new transaction.</p>
            {expenses.length === 0 && (
              <button
                onClick={onLoadSampleData}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-blue-500/25 transition-all"
              >
                Populate Sample Data
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[9.5px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Merchant & Description</th>
                <th className="py-3 px-4">Payment Channel</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-xs">
              {paginatedExpenses.map((expense) => {
                const cat = catMap.get(expense.category);
                return (
                  <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3 px-5 font-mono text-slate-400 whitespace-nowrap">
                      {expense.date}
                    </td>
                    
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${cat?.color}20`, color: cat?.color }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat?.color }} />
                        {cat?.name || 'Unspecified'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col max-w-[220px] md:max-w-[320px]">
                        <span className="font-bold text-white truncate">{expense.payee}</span>
                        <span className="text-[11px] text-slate-400 truncate mt-0.5">{expense.description}</span>
                        {expense.notes && (
                          <span className="text-[10px] text-amber-300 italic bg-amber-500/10 max-w-fit px-1.5 py-0.5 rounded border border-amber-500/20 mt-1 lines-2">
                            Note: {expense.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 capitalize">
                      <div className="flex items-center gap-1 text-[11px]">
                        <CreditCard size={12} className="text-slate-500" />
                        {expense.paymentMethod.replace('_', ' ')}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-white font-mono text-sm whitespace-nowrap">
                      {formatCurrency(expense.amount, currency.symbol)}
                    </td>

                    <td className="py-3 px-5 text-center whitespace-nowrap">
                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer"
                        title="Delete expense entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer Controls */}
      {filteredExpenses.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-slate-400 shadow-inner">
          <span>
            Showing <b className="text-white font-bold">{Math.min(filteredExpenses.length, (currentPage - 1) * itemsPerPage + 1)}</b> to{' '}
            <b className="text-white font-bold">
              {Math.min(filteredExpenses.length, currentPage * itemsPerPage)}
            </b>{' '}
            of <b className="text-white font-bold">{filteredExpenses.length}</b> records
          </span>

          <div className="flex items-center gap-2">
            <button
              id="btn-pagination-prev"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 px-3 rounded-lg border border-white/10 hover:bg-white/10 text-white disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors font-semibold"
            >
              <ChevronLeft size={13} className="inline mr-0.5" />
              Prev
            </button>
            <span className="font-mono text-xs font-bold px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              id="btn-pagination-next"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 px-3 rounded-lg border border-white/10 hover:bg-white/10 text-white disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors font-semibold"
            >
              Next
              <ChevronRight size={13} className="inline ml-0.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
