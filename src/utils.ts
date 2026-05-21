/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Currency } from './types';

export const CURRENCIES: Currency[] = [
  { code: 'PKR', symbol: 'Rs', name: 'PKR (Pakistani Rupee)' },
  { code: 'USD', symbol: '$', name: 'USD (United States Dollar)' },
  { code: 'EUR', symbol: '€', name: 'EUR (Euro)' },
];

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, symbol: string): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (symbol === 'Rs') {
    return `Rs ${formatted}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Parsing clean dates
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date of Monday of the week containing the given date string YYYY-MM-DD
 */
export function getMondayOfDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  // day: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const mon = new Date(date.setDate(diff));
  return getLocalDateString(mon);
}

/**
 * Add or subtract days from custom string Date
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

/**
 * Returns Start & End dates of a Mon-Sun string week (given a Monday date)
 */
export function getWeekRangeLabel(mondayStr: string): string {
  const mon = new Date(mondayStr);
  const sun = new Date(mondayStr);
  sun.setDate(mon.getDate() + 6);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monMonth = monthNames[mon.getMonth()];
  const monDay = mon.getDate();
  const monYear = mon.getFullYear();

  const sunMonth = monthNames[sun.getMonth()];
  const sunDay = sun.getDate();
  const sunYear = sun.getFullYear();

  return `${monMonth} ${monDay}, ${monYear} - ${sunMonth} ${sunDay}, ${sunYear}`;
}

/**
 * Check if a date string YYYY-MM-DD is within mon-sun week of a Monday date
 */
export function isDateInWeek(dateStr: string, mondayStr: string): boolean {
  const date = new Date(dateStr).getTime();
  const start = new Date(mondayStr).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000 - 1; // 7 days in ms minus 1ms
  return date >= start && date <= end;
}
