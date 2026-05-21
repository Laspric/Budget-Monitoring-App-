/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  payee: string;
  notes?: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon key name
  color: string; // Hex color or Tailwind accent class
  budget?: number; // Optional monthly limit
}

export type TimeRange = 'month' | 'year' | 'custom';
export type TrackingViewMode = 'days' | 'week' | 'month' | 'year';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface ExpenseFilters {
  search: string;
  category: string;
  paymentMethod: string;
  month: string; // YYYY-MM
  year: string;  // YYYY
  startDate?: string;
  endDate?: string;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  amount: number;
}
