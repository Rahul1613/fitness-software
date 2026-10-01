import { parseISO, differenceInCalendarDays, addMonths, format, isAfter, startOfDay } from 'date-fns';
import type { Member, FeeStatusType } from '@/types';

export interface FeeStatusInfo {
  status: FeeStatusType;
  label: string;
  daysDiff: number; // positive = days until due, negative = days overdue
  badgeClass: string;
  dotClass: string;
}

export function computeFeeStatus(
  member: Pick<Member, 'status' | 'current_due_date'>,
  reminderDaysBefore: number = 5,
  referenceDate: Date = new Date()
): FeeStatusInfo {
  if (member.status === 'inactive') {
    return {
      status: 'inactive',
      label: 'Inactive',
      daysDiff: 0,
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      dotClass: 'bg-slate-500',
    };
  }

  if (!member.current_due_date) {
    return {
      status: 'overdue',
      label: 'No Plan Active',
      daysDiff: -999,
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dotClass: 'bg-rose-500',
    };
  }

  const today = startOfDay(referenceDate);
  const dueDate = startOfDay(parseISO(member.current_due_date));
  const diffDays = differenceInCalendarDays(dueDate, today);

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: 'overdue',
      label: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`,
      daysDiff: diffDays,
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-medium',
      dotClass: 'bg-rose-500',
    };
  }

  if (diffDays <= reminderDaysBefore) {
    return {
      status: 'due_soon',
      label: diffDays === 0 ? 'Due Today' : `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
      daysDiff: diffDays,
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-medium',
      dotClass: 'bg-amber-500',
    };
  }

  return {
    status: 'paid',
    label: 'Paid / Active',
    daysDiff: diffDays,
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-medium',
    dotClass: 'bg-emerald-500',
  };
}

/**
 * Calculates start and end dates for a new membership period.
 * Business Rule:
 * The new period starts on the member's current due date if it is still in the future,
 * otherwise on the payment date.
 * period_end = period_start + duration_months.
 */
export function calculatePaymentPeriod(
  currentDueDateStr?: string,
  durationMonths: number = 1,
  paymentDateStr: string = format(new Date(), 'yyyy-MM-dd')
): { period_start: string; period_end: string } {
  const today = startOfDay(new Date());
  let startDate: Date;

  if (currentDueDateStr) {
    const currentDueDate = startOfDay(parseISO(currentDueDateStr));
    if (isAfter(currentDueDate, today)) {
      // Future due date: continue seamlessly from current due date
      startDate = currentDueDate;
    } else {
      // Past or today: start from payment date
      startDate = startOfDay(parseISO(paymentDateStr));
    }
  } else {
    startDate = startOfDay(parseISO(paymentDateStr));
  }

  const endDate = addMonths(startDate, durationMonths);

  return {
    period_start: format(startDate, 'yyyy-MM-dd'),
    period_end: format(endDate, 'yyyy-MM-dd'),
  };
}
