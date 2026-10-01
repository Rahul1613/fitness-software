import { format, parseISO, isValid } from 'date-fns';

export function formatDate(dateStr?: string | null, formatStr: string = 'dd MMM yyyy'): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, formatStr) : '—';
  } catch {
    return '—';
  }
}

export function formatCurrency(amount: number | string = 0, currency: string = 'INR'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  if (currency === 'INR') {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return `${currency} ${num.toLocaleString()}`;
}
