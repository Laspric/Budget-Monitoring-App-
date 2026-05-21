/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, Expense } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries & Food', icon: 'ShoppingBag', color: '#10b981', budget: 600 },
  { id: 'utilities', name: 'Utilities & Bills', icon: 'Zap', color: '#f59e0b', budget: 350 },
  { id: 'housing', name: 'Rent & Mortgage', icon: 'Home', color: '#3b82f6', budget: 1500 },
  { id: 'maintenance', name: 'Home Repairs & Supplies', icon: 'Hammer', color: '#f43f5e', budget: 200 },
  { id: 'insurance', name: 'Home & Health Insurance', icon: 'ShieldAlert', color: '#8b5cf6', budget: 250 },
  { id: 'education', name: 'School & Kids', icon: 'Baby', color: '#06b6d4', budget: 400 },
  { id: 'transport', name: 'Fuel & Transit', icon: 'Car', color: '#eab308', budget: 250 },
  { id: 'medical', name: 'Health & Pharmacy', icon: 'Activity', color: '#14b8a6', budget: 150 },
  { id: 'entertainment', name: 'Entertainment & Leisure', icon: 'Tv', color: '#ec4899', budget: 150 },
  { id: 'misc', name: 'Miscellaneous', icon: 'CheckSquare', color: '#64748b', budget: 100 },
];

export const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

/**
 * Generates highly realistic house expenses back-dated for 3 months relative to May 2026.
 */
export function generateSampleExpenses(): Expense[] {
  const samples: Expense[] = [];

  // Anchor to May 21, 2026 (the current time provided)
  const years = [2026, 2025];
  
  // We'll generate standard monthly re-occurring bills first
  const monthlyRecurring = [
    { category: 'housing', payee: 'Apex Real Estate', desc: 'Monthly mortgage payment', baseAmount: 1450, day: 1, method: 'bank_transfer' as const },
    { category: 'utilities', payee: 'City Power & Gas', desc: 'Electricity and heating bill', baseAmount: 165, day: 5, method: 'bank_transfer' as const },
    { category: 'utilities', payee: 'FiberOptic Net', desc: 'High-speed internet', baseAmount: 75, day: 10, method: 'card' as const },
    { category: 'utilities', payee: 'Urban Water Utility', desc: 'Quarterly water fee', baseAmount: 60, day: 15, method: 'bank_transfer' as const },
    { category: 'insurance', payee: 'Global Shield', desc: 'Household insurance', baseAmount: 110, day: 3, method: 'card' as const },
    { category: 'insurance', payee: 'WellHealth Co', desc: 'Family medical coverage', baseAmount: 140, day: 3, method: 'card' as const },
    { category: 'education', payee: 'Oakwood Elementary', desc: 'After school activity fee', baseAmount: 180, day: 5, method: 'bank_transfer' as const },
  ];

  // Let's generate data for March, April, and May 2026.
  const monthsData = [
    { year: 2026, month: 3, days: 31 }, // March 2026
    { year: 2026, month: 4, days: 30 }, // April 2026
    { year: 2026, month: 5, days: 21 }, // May 2026 (up to today May 21)
    { year: 2025, month: 12, days: 31 }, // Dec 2025 for annual comparison reference
    { year: 2025, month: 11, days: 30 }, // Nov 2025
    { year: 2025, month: 10, days: 31 }, // Oct 2025
  ];

  let idCounter = 1;

  monthsData.forEach(({ year, month, days }) => {
    // 1. Add recurring payments
    monthlyRecurring.forEach((bill) => {
      // Small randomized variations in utilities, water, gas
      const variance = bill.category === 'utilities' ? (Math.random() * 30 - 15) : 0;
      const amount = parseFloat((bill.baseAmount + variance).toFixed(2));
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(bill.day).padStart(2, '0')}`;
      
      samples.push({
        id: `sample-${idCounter++}`,
        date: dateStr,
        amount,
        category: bill.category,
        description: bill.desc,
        payee: bill.payee,
        paymentMethod: bill.method,
      });
    });

    // 2. Add weekly groceries (happening roughly every 6-7 days)
    const groceryStores = ['Organic Foods Market', 'SafeMart Superstore', 'Green Grocer Local', 'CostClub Wholesale'];
    for (let d = 3; d <= days; d += 7) {
      const store = groceryStores[Math.floor(Math.random() * groceryStores.length)];
      const amount = parseFloat((Math.random() * 110 + 60).toFixed(2));
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      samples.push({
        id: `sample-${idCounter++}`,
        date: dateStr,
        amount,
        category: 'groceries',
        description: 'Weekly family groceries',
        payee: store,
        paymentMethod: Math.random() > 0.3 ? 'card' : 'cash',
      });
    }

    // 3. Add transport / fuel (every 10 days)
    for (let d = 8; d <= days; d += 10) {
      const amount = parseFloat((Math.random() * 35 + 35).toFixed(2));
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      samples.push({
        id: `sample-${idCounter++}`,
        date: dateStr,
        amount,
        category: 'transport',
        description: 'Fuel refill',
        payee: 'Shell Energy / Union 76',
        paymentMethod: 'card',
      });
    }

    // 4. Random single maintenance / health / entertainment events
    // Home Repair
    if (Math.random() > 0.4) {
      const maints = [
        { payee: 'Home Depot', desc: 'Gardening soil & plants', amt: 45 },
        { payee: 'Fixit Plumbing', desc: 'Kitchen sink connector tube repair', amt: 125 },
        { payee: 'Electrical Spares', desc: 'LED kitchen replacement bulbs', amt: 32 },
      ];
      const selected = maints[Math.floor(Math.random() * maints.length)];
      const repairDay = Math.floor(Math.random() * (days - 2)) + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(repairDay).padStart(2, '0')}`;
      samples.push({
        id: `sample-${idCounter++}`,
        date: dateStr,
        amount: selected.amt,
        category: 'maintenance',
        description: selected.desc,
        payee: selected.payee,
        paymentMethod: 'card',
      });
    }

    // Health
    if (Math.random() > 0.3) {
      const medDay = Math.floor(Math.random() * (days - 2)) + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(medDay).padStart(2, '0')}`;
      samples.push({
        id: `sample-${idCounter++}`,
        date: dateStr,
        amount: parseFloat((Math.random() * 45 + 15).toFixed(2)),
        category: 'medical',
        description: 'Prescription refills & vitamins',
        payee: 'CVS Pharmacy',
        paymentMethod: 'card',
      });
    }

    // Entertainment
    for (let k = 0; k < 2; k++) {
      const entMeals = [
        { payee: 'Netflix', desc: 'Streaming subscription', amt: 16.99, cat: 'entertainment' },
        { payee: 'Olive Garden Bistro', desc: 'Family Friday dinner out', amt: 85.00, cat: 'entertainment' },
        { payee: 'Downtown Cinema', desc: 'Movie night tickets', amt: 38.50, cat: 'entertainment' },
        { payee: 'Amazon Prime', desc: 'Digital content rental', amt: 7.99, cat: 'entertainment' },
      ];
      const selected = entMeals[Math.floor(Math.random() * entMeals.length)];
      const entDay = Math.floor(Math.random() * (days - 2)) + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(entDay).padStart(2, '0')}`;
      samples.push({
        id: `sample-${idCounter++}`,
        date: dateStr,
        amount: selected.amt,
        category: selected.cat,
        description: selected.desc,
        payee: selected.payee,
        paymentMethod: 'card',
      });
    }
  });

  // Sort samples chronologically cascading up to today
  return samples.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
