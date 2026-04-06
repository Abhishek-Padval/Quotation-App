import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CalculatedTotals {
  totalBasic: number;
  totalGst: number;
  grandTotal: number;
  itemTotals: {
    basic: number;
    gst: number;
    total: number;
  }[];
}

export function calculateQuotationTotals(items: { basic_price: number; quantity: number; gst_percent: number }[]): CalculatedTotals {
  const itemTotals = items.map(item => {
    const basic = Number((item.basic_price * item.quantity).toFixed(2));
    const gst = Number((basic * (item.gst_percent / 100)).toFixed(2));
    const total = Number((basic + gst).toFixed(2));
    return { basic, gst, total };
  });

  const totalBasic = Number(itemTotals.reduce((sum, t) => sum + t.basic, 0).toFixed(2));
  const totalGst = Number(itemTotals.reduce((sum, t) => sum + t.gst, 0).toFixed(2));
  const grandTotal = Number((totalBasic + totalGst).toFixed(2));

  return {
    totalBasic,
    totalGst,
    grandTotal,
    itemTotals
  };
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function numberToWords(num: number): string {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  let numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only' : '';
  return str.toUpperCase();
}
