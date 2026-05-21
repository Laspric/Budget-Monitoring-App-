/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Expense, Category, Currency, TrackingViewMode } from '../types';
import { formatCurrency, getLocalDateString, isDateInWeek } from '../utils';
import { PiggyBank, Award, AlertTriangle, TrendingUp, Sparkles, RefreshCw, Bot } from 'lucide-react';

interface ExpenseChartsProps {
  expenses: Expense[];
  categories: Category[];
  selectedDay: string;
  selectedWeek: string;
  selectedMonth: string; // YYYY-MM
  selectedYear: string;  // YYYY
  viewMode: TrackingViewMode;
  currency: Currency;
  activeLabel: string;
}

export function ExpenseCharts({
  expenses,
  categories,
  selectedDay,
  selectedWeek,
  selectedMonth,
  selectedYear,
  viewMode,
  currency,
  activeLabel,
}: ExpenseChartsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [donutHoverIndex, setDonutHoverIndex] = useState<number | null>(null);

  // Gemini AI Insights state
  const [aiInsights, setAiInsights] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // --- DATA COMPUTATION ---

  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(c => { map[c.id] = 0; });

    const filtered = expenses.filter(e => {
      if (viewMode === 'days') {
        return e.date === selectedDay;
      } else if (viewMode === 'week') {
        return isDateInWeek(e.date, selectedWeek);
      } else if (viewMode === 'month') {
        const eDate = new Date(e.date);
        const eYear = eDate.getFullYear().toString();
        const eMonth = `${eYear}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
        return eMonth === selectedMonth;
      } else {
        const eDate = new Date(e.date);
        const eYear = eDate.getFullYear().toString();
        return eYear === selectedYear;
      }
    });

    let total = 0;
    filtered.forEach(e => {
      const catId = e.category;
      if (map[catId] !== undefined) {
        map[catId] += e.amount;
      } else {
        map['misc'] = (map['misc'] || 0) + e.amount;
      }
      total += e.amount;
    });

    return categories
      .map(c => ({
        ...c,
        spent: parseFloat((map[c.id] || 0).toFixed(2)),
        percentage: total > 0 ? parseFloat((((map[c.id] || 0) / total) * 100).toFixed(1)) : 0,
      }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [expenses, categories, selectedDay, selectedWeek, selectedMonth, selectedYear, viewMode]);

  const totalSpent = useMemo(() => {
    return categorySummary.reduce((sum, item) => sum + item.spent, 0);
  }, [categorySummary]);

  // Total budget for active filters scaled down by tracking modes
  const totalBudget = useMemo(() => {
    const monthlyTotal = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
    if (viewMode === 'days') {
      // Approximate daily budget is monthly budget / 30
      return parseFloat((monthlyTotal / 30).toFixed(2));
    } else if (viewMode === 'week') {
      // Weekly budget is monthly * 12 / 52 or rough monthly / 4
      return parseFloat((monthlyTotal * 7 / 30).toFixed(2));
    } else if (viewMode === 'month') {
      return monthlyTotal;
    } else {
      // Annual budget is monthly * 12
      return monthlyTotal * 12;
    }
  }, [categories, viewMode]);

  // --- RE-FETCH GEMINI AI INSIGHTS AUTOMATICALLY ---
  const fetchAiInsights = async () => {
    setIsAiLoading(true);
    setAiError('');
    try {
      const response = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: categorySummary.map(c => ({
            name: c.name,
            spent: c.spent,
            budget: viewMode === 'month' ? c.budget : (c.budget ? parseFloat(((c.budget * (viewMode === 'days' ? 1/30 : viewMode === 'week' ? 7/30 : viewMode === 'year' ? 12 : 1))).toFixed(2)) : 0),
          })),
          currencySymbol: currency.symbol,
          viewMode,
          activeLabel,
        }),
      });
      const data = await response.json();
      setAiInsights(data.markdown || 'No analysis available.');
    } catch (err: any) {
      console.error('Error loading AI saving insights:', err);
      setAiError('Failed to synchronize saving guidelines.');
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetchAiInsights();
  }, [expenses.length, viewMode, selectedDay, selectedWeek, selectedMonth, selectedYear, currency.code]);

  // Temporal trend: Mon-Sun for Week, Last 7 days for Day, Monthly (day of month) or Annual (month of year)
  const trendData = useMemo(() => {
    if (viewMode === 'days') {
      // Cumulative daily trend for the 7 days leading up to selectedDay
      const dayValues = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(selectedDay);
        d.setDate(d.getDate() - i);
        const dStr = getLocalDateString(d); // YYYY-MM-DD
        const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        dayValues.push({
          label,
          fullName: d.toLocaleDateString('en-US', { dateStyle: 'medium' }),
          value: 0,
          dateStr: dStr,
          runningTotal: 0,
        });
      }

      const filtered = expenses.filter(e => {
        return dayValues.some(dv => dv.dateStr === e.date);
      });

      filtered.forEach(e => {
        const dv = dayValues.find(d => d.dateStr === e.date);
        if (dv) dv.value += e.amount;
      });

      let acc = 0;
      dayValues.forEach(dv => {
        acc += dv.value;
        dv.runningTotal = parseFloat(acc.toFixed(2));
        dv.value = parseFloat(dv.value.toFixed(2));
      });

      return dayValues;
    } else if (viewMode === 'week') {
      // Group by the 7 days of the selected week (Mon - Sun)
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const monDate = new Date(selectedWeek);

      const weekValues = dayNames.map((name, index) => {
        const currentDay = new Date(monDate);
        currentDay.setDate(monDate.getDate() + index);
        const currentDayStr = getLocalDateString(currentDay);
        return {
          label: name,
          fullName: currentDay.toLocaleDateString('en-US', { dateStyle: 'long' }),
          value: 0,
          dateStr: currentDayStr,
          runningTotal: 0,
        };
      });

      const filtered = expenses.filter(e => {
        return isDateInWeek(e.date, selectedWeek);
      });

      filtered.forEach(e => {
        const wv = weekValues.find(w => w.dateStr === e.date);
        if (wv) wv.value += e.amount;
      });

      let acc = 0;
      weekValues.forEach(wv => {
        acc += wv.value;
        wv.runningTotal = parseFloat(acc.toFixed(2));
        wv.value = parseFloat(wv.value.toFixed(2));
      });

      return weekValues;
    } else if (viewMode === 'month') {
      // Generate days of the month
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const dayValues = Array.from({ length: daysInMonth }, (_, i) => ({
        label: `${i + 1}`,
        fullName: `${monthStr}/${String(i + 1).padStart(2, '0')}`,
        value: 0,
        runningTotal: 0,
      }));

      const filtered = expenses.filter(e => {
        const d = new Date(e.date);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return mStr === selectedMonth;
      });

      filtered.forEach(e => {
        const dayNum = new Date(e.date).getDate();
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          dayValues[dayNum - 1].value += e.amount;
        }
      });

      let acc = 0;
      dayValues.forEach(dv => {
        acc += dv.value;
        dv.runningTotal = parseFloat(acc.toFixed(2));
        dv.value = parseFloat(dv.value.toFixed(2));
      });

      return dayValues;
    } else {
      // Annual: 12 months list
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthValues = monthNames.map((name, index) => ({
        label: name,
        fullName: `${name} ${selectedYear}`,
        value: 0,
        runningTotal: 0,
      }));

      const filtered = expenses.filter(e => {
        return new Date(e.date).getFullYear().toString() === selectedYear;
      });

      filtered.forEach(e => {
        const monthIndex = new Date(e.date).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthValues[monthIndex].value += e.amount;
        }
      });

      let acc = 0;
      monthValues.forEach(mv => {
        acc += mv.value;
        mv.runningTotal = parseFloat(acc.toFixed(2));
        mv.value = parseFloat(mv.value.toFixed(2));
      });

      return monthValues;
    }
  }, [expenses, selectedDay, selectedWeek, selectedMonth, selectedYear, viewMode]);

  // --- SVG PATH CALCULATIONS ---
  const points = useMemo(() => {
    if (trendData.length === 0) return { linePath: '', areaPath: '', coords: [] };

    const svgWidth = 600;
    const svgHeight = 220;
    const paddingLeft = 55;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const values = trendData.map(d => d.runningTotal);
    const maxValue = Math.max(...values, 100); 
    const minValue = 0;

    const coords = trendData.map((d, index) => {
      const x = paddingLeft + (index / (trendData.length - 1)) * chartWidth;
      const ratio = (d.runningTotal - minValue) / (maxValue - minValue);
      const y = svgHeight - paddingBottom - ratio * chartHeight;
      return { x, y, ...d };
    });

    let linePath = '';
    let areaPath = '';

    if (coords.length > 0) {
      linePath = `M ${coords[0].x} ${coords[0].y}`;
      coords.slice(1).forEach((pt) => {
        linePath += ` L ${pt.x} ${pt.y}`;
      });

      areaPath = `${linePath} L ${coords[coords.length - 1].x} ${svgHeight - paddingBottom} L ${coords[0].x} ${svgHeight - paddingBottom} Z`;
    }

    return { linePath, areaPath, coords, chartWidth, chartHeight, svgWidth, svgHeight, paddingLeft, paddingRight, paddingTop, paddingBottom, maxValue };
  }, [trendData]);

  // SVG Donut Calculation
  const donutSegments = useMemo(() => {
    let currentAngle = 0;
    const radius = 65;
    const cx = 85;
    const cy = 85;
    const circumference = 2 * Math.PI * radius;

    return categorySummary.map((cat) => {
      const percentage = cat.percentage;
      const strokeLength = (percentage / 100) * circumference;
      const strokeOffset = circumference - currentAngle;
      
      currentAngle += strokeLength;

      return {
        ...cat,
        cx,
        cy,
        radius,
        strokeLength,
        strokeOffset,
        circumference,
      };
    });
  }, [categorySummary]);

  const budgetRatio = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isBudgetWarning = budgetRatio >= 85 && budgetRatio < 100;
  const isBudgetDanger = budgetRatio >= 100;

  // Render markdown for insights card
  const renderInsightsMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed.startsWith('###')) {
        return <h5 key={idx} className="text-xs font-black text-white mt-3.5 mb-1.5 flex items-center gap-1.5 tracking-wider">{trimmed.replace(/^###\s+/, '')}</h5>;
      }
      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        return <h4 key={idx} className="text-xs font-black text-purple-400 mt-4 mb-2 border-b border-white/5 pb-1 uppercase tracking-widest font-mono">{trimmed.replace(/^#+\s+/, '')}</h4>;
      }

      const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
      if (isBullet) {
        trimmed = trimmed.replace(/^[\s]*[\*\-]\s/, '');
      }

      const parts = trimmed.split('**');
      const renderedLine = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <span key={pIdx} className="font-extrabold text-[#f1f5f9]">{part}</span>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed pl-1.5 my-1 font-medium hover:text-slate-100 transition-colors">
            <span className="text-purple-400 font-extrabold select-none mt-0.5">•</span>
            <div>{renderedLine}</div>
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-2 font-medium">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      
      {/* 1. KEY ANALYTIC CARDS CONTAINER */}
      <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Spent Card */}
        <div id="card-total-spent" className="glass-card rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:bg-white/5 transition-all">
          <div className="absolute top-0 right-0 p-3 bg-emerald-500/10 text-emerald-400 rounded-bl-3xl transition-colors group-hover:bg-emerald-500/15">
            <TrendingUp size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Spent ({viewMode === 'days' ? 'Day' : viewMode === 'week' ? 'Week' : viewMode === 'month' ? 'Month' : 'Year'})</p>
            <h3 className="text-2xl font-extrabold text-white mt-2 font-mono tracking-tight text-shadow">
              {formatCurrency(totalSpent, currency.symbol)}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1.5 font-semibold font-mono tracking-wider">
            <Sparkles size={14} className="text-emerald-400" />
            Active monitoring period
          </p>
        </div>

        {/* Budget Status Card */}
        <div id="card-budget" className="glass-card rounded-3xl p-5 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:bg-white/5 transition-all">
          <div className="absolute top-0 right-0 p-3 bg-blue-500/10 text-blue-400 rounded-bl-3xl">
            <PiggyBank size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Calculated Limit ({viewMode})</p>
            <h3 className="text-2xl font-extrabold text-white mt-2 font-mono tracking-tight text-shadow">
              {formatCurrency(totalBudget, currency.symbol)}
            </h3>
          </div>
          <div className="mt-4">
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isBudgetDanger ? 'bg-red-500 animate-pulse' : isBudgetWarning ? 'bg-amber-405' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(budgetRatio, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-xs">
              <span className="text-slate-400 font-medium font-mono">{budgetRatio.toFixed(0)}% used</span>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(Math.max(0, totalBudget - totalSpent), currency.symbol)} left
              </span>
            </div>
          </div>
        </div>

        {/* Efficiency Insights Card (Gemini AI Analyzer) */}
        <div id="card-insights" className="glass-card rounded-3xl p-5 border border-white/10 shadow-2xl relative flex flex-col justify-between group hover:bg-white/5 transition-all sm:col-span-1 max-h-[220px] overflow-hidden">
          <div className="absolute top-0 right-0 p-3 bg-purple-500/10 text-purple-400 rounded-bl-3xl flex items-center gap-1">
            <button 
              onClick={fetchAiInsights} 
              disabled={isAiLoading}
              title="Refresh AI insights"
              className="hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw size={14} className={`stroke-[2.5] ${isAiLoading ? 'animate-spin' : ''}`} />
            </button>
            <Bot size={16} className="stroke-[2.5]" />
          </div>
          
          <div className="overflow-y-auto pr-1 select-text flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-400/80 mb-2 flex items-center gap-1.5">
              💡 Gemini saving advice
            </p>
            
            {isAiLoading ? (
              <div className="space-y-2 mt-4">
                <div className="h-3 w-4/5 bg-white/5 animate-pulse rounded" />
                <div className="h-2 w-full bg-white/5 animate-pulse rounded" />
                <div className="h-2 w-5/6 bg-white/5 animate-pulse rounded" />
                <p className="text-[10px] text-slate-500 mt-2 font-mono">Formulating spending curves...</p>
              </div>
            ) : aiError ? (
              <div className="text-amber-400 flex flex-col justify-center items-center h-28 gap-2 text-center p-2">
                <AlertTriangle size={24} />
                <span className="text-xs font-bold leading-tight">{aiError}</span>
                <button 
                  onClick={fetchAiInsights} 
                  className="px-3 py-1 bg-amber-500/20 text-xs font-bold border border-amber-500/35 hover:bg-amber-500/35 text-amber-300 rounded-lg shrink-0 mt-1 cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 scrollbar-thin scrollbar-thumb-purple-950/20 select-text">
                {renderInsightsMarkdown(aiInsights)}
              </div>
            )}
          </div>
          
          <div className="border-t border-white/5 pt-1.5 mt-1.5 flex justify-between items-center text-[9px] font-mono text-slate-500 font-bold shrink-0">
            <span>nestledger models/gemini-3.5-flash</span>
            <span className="text-[#a855f7] flex items-center gap-0.5">● Analysis active</span>
          </div>
        </div>
      </div>

      {/* 2. CUMULATIVE TREND SVG CHART */}
      <div id="cohort-trend-chart" className="lg:col-span-7 glass p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">Cumulative Savings & Spend Trend</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'days' 
              ? 'Showing 7 days trend leading to selected day' 
              : 'Shows continuous cumulative sum of spending over active tracking period'}
          </p>
        </div>

        {/* Dynamic Graphic Stage */}
        <div className="relative mt-4 h-56 w-full flex items-center justify-center bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          {points.coords.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium font-sans">No expense records found for this period filter.</p>
          ) : (
            <svg 
              className="w-full h-full select-none"
              viewBox={`0 0 ${points.svgWidth} ${points.svgHeight}`}
              preserveAspectRatio="none"
            >
              {/* Definitions for gradients */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid-lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = points.paddingTop + ratio * points.chartHeight;
                const valueLine = points.maxValue - ratio * points.maxValue;
                return (
                  <g key={index} className="opacity-70">
                    <line 
                      x1={points.paddingLeft} 
                      y1={y} 
                      x2={points.svgWidth - points.paddingRight} 
                      y2={y} 
                      stroke="rgba(255, 255, 255, 0.08)" 
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text 
                      x={points.paddingLeft - 8} 
                      y={y + 3} 
                      fill="#94a3b8" 
                      fontSize="9" 
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {currency.symbol}{Math.round(valueLine)}
                    </text>
                  </g>
                );
              })}

              {/* Area filled path under the line */}
              <path d={points.areaPath} fill="url(#chartGradient)" />

              {/* Main curved line path */}
              <path 
                d={points.linePath} 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Render small dots for each record */}
              {points.coords.map((pt, index) => (
                <circle
                  key={index}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === index ? 6 : 1.5}
                  fill={hoveredIndex === index ? "#60a5fa" : "#ffffff"}
                  stroke="#3b82f6"
                  strokeWidth={hoveredIndex === index ? 3 : 1.5}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}

              {/* Bottom Labels along X axis */}
              {points.coords.filter((_, idx) => {
                const step = Math.ceil(points.coords.length / 8);
                return idx % step === 0 || idx === points.coords.length - 1;
              }).map((pt, index) => (
                <text
                  key={index}
                  x={pt.x}
                  y={points.svgHeight - 8}
                  fill="#94a3b8"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {pt.label}
                </text>
              ))}
            </svg>
          )}

          {/* Floating Hover Card Detail Tooltip */}
          {hoveredIndex !== null && points.coords[hoveredIndex] && (
            <div 
              className="absolute bg-slate-950/90 border border-white/20 text-white p-2.5 rounded-lg shadow-2xl text-xs flex flex-col pointer-events-none transition-all duration-75 b-blur-md"
              style={{
                left: `${(points.coords[hoveredIndex].x / points.svgWidth) * 98}%`,
                top: `${(points.coords[hoveredIndex].y / points.svgHeight) * 75}%`,
                transform: 'translate(-50%, -110%)',
                zIndex: 40,
              }}
            >
              <span className="font-bold text-slate-300">{points.coords[hoveredIndex].fullName}</span>
              <div className="flex flex-col mt-1 font-mono gap-0.5 text-[11px]">
                <span>Logged: <b className="text-blue-400">{formatCurrency(points.coords[hoveredIndex].value, currency.symbol)}</b></span>
                <span>Cumulative: <b className="text-emerald-400">{formatCurrency(points.coords[hoveredIndex].runningTotal, currency.symbol)}</b></span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-white/10 pt-3 mt-3">
          <span>{viewMode === 'days' ? `Daily frames for past week` : viewMode === 'week' ? `Days in ${activeLabel}` : viewMode === 'month' ? `Days in ${selectedMonth}` : `Months of ${selectedYear}`}</span>
          <span className="flex items-center gap-1.5 font-semibold font-mono text-[10px]">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
            Cumulative Spent ({currency.code})
          </span>
        </div>
      </div>

      {/* 3. CATEGORY DISTRIBUTION DONUT CHART */}
      <div id="cohort-distribution-chart" className="lg:col-span-5 glass p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">Categorical Distribution</h4>
          <p className="text-xs text-slate-400 mt-0.5">Breakdown of family household costs by category</p>
        </div>

        {/* Donut Layout Stage */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-4 items-center">
          <div className="sm:col-span-12 md:col-span-5 flex justify-center relative">
            {categorySummary.length === 0 ? (
              <div className="w-28 h-28 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-xs text-slate-400">Empty</div>
            ) : (
              <div className="relative w-[170px] h-[170px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 170 170">
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={seg.id}
                      cx={seg.cx}
                      cy={seg.cy}
                      r={seg.radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={donutHoverIndex === idx ? 20 : 15}
                      strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                      strokeDashoffset={seg.strokeOffset}
                      className="transition-all duration-150 cursor-pointer"
                      style={{ transformOrigin: 'center' }}
                      onMouseEnter={() => setDonutHoverIndex(idx)}
                      onMouseLeave={() => setDonutHoverIndex(null)}
                    />
                  ))}
                </svg>

                {/* Inner label on hover or default total */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none block">
                    {donutHoverIndex !== null ? categorySummary[donutHoverIndex].name : 'Total Spent'}
                  </span>
                  <span className="text-sm font-extrabold font-mono text-white mt-1 block">
                    {formatCurrency(donutHoverIndex !== null ? categorySummary[donutHoverIndex].spent : totalSpent, currency.symbol).split('.')[0]}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 block">
                    {donutHoverIndex !== null ? `${categorySummary[donutHoverIndex].percentage}%` : 'Selected'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Side Legend & List */}
          <div className="sm:col-span-12 md:col-span-7 space-y-2 max-h-[175px] overflow-y-auto pr-1">
            {categorySummary.slice(0, 5).map((cat, idx) => (
              <div 
                key={cat.id} 
                className={`flex justify-between items-center text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                  donutHoverIndex === idx ? 'bg-white/10 font-bold text-white' : 'text-slate-300 hover:bg-white/5'
                }`}
                onMouseEnter={() => setDonutHoverIndex(idx)}
                onMouseLeave={() => setDonutHoverIndex(null)}
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  <span className="font-bold text-slate-100">{formatCurrency(cat.spent, currency.symbol).split('.')[0]}</span>
                  <span className="text-slate-400 text-[10px]">{cat.percentage}%</span>
                </div>
              </div>
            ))}
            {categorySummary.length > 5 && (
              <div className="text-[10px] text-slate-500 pl-4 py-0.5 italic font-semibold font-sans">
                + {categorySummary.length - 5} other categories
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 pt-3 mt-3 text-[11px] text-slate-400 flex justify-between">
          <span>Categories with spend logs</span>
          <span>Hover sections to inspect</span>
        </div>
      </div>

    </div>
  );
}
