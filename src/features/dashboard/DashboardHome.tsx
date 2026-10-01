import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  MessageCircle,
  Phone,
  CheckCircle2,
  QrCode,
} from 'lucide-react';
import { getAllMembers, getAllPayments, getGymSettings, getTodayAttendance } from '@/db/repository';
import { computeFeeStatus } from '@/lib/feeStatus';
import { formatCurrency, formatDate } from '@/lib/dateUtils';
import { buildWhatsAppUrl, buildCallUrl, formatTemplate } from '@/lib/messageTemplates';
import type { Member, Payment, Gym } from '@/types';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [gym, setGym] = useState<Gym | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Quick payment modal state
  const [paymentModalMember, setPaymentModalMember] = useState<Member | null>(null);

  const loadData = async () => {
    try {
      const [g, m, p, att] = await Promise.all([
        getGymSettings(),
        getAllMembers(),
        getAllPayments(),
        getTodayAttendance(),
      ]);
      setGym(g || null);
      setMembers(m);
      setPayments(p);
      setTodayCheckins(att.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reminderDays = gym?.reminder_days_before ?? 5;

  // Compute fee categories
  const activeMembers = members.filter((m) => m.status === 'active');
  const categorized = activeMembers.map((m) => ({
    member: m,
    feeInfo: computeFeeStatus(m, reminderDays),
  }));

  const overdueList = categorized
    .filter((c) => c.feeInfo.status === 'overdue')
    .sort((a, b) => a.feeInfo.daysDiff - b.feeInfo.daysDiff);

  const dueSoonList = categorized
    .filter((c) => c.feeInfo.status === 'due_soon')
    .sort((a, b) => a.feeInfo.daysDiff - b.feeInfo.daysDiff);

  // Collection this month
  const currentMonthPrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
  const monthPayments = payments.filter((p) => p.paid_on.startsWith(currentMonthPrefix));
  const monthTotalCollection = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* IN-APP DUE ALERT BANNER */}
      {(overdueList.length > 0 || dueSoonList.length > 0) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-dark-850 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pending Fee Alerts</h3>
              <p className="text-xs text-slate-300">
                <span className="text-rose-400 font-bold">{overdueList.length} members overdue</span>
                {dueSoonList.length > 0 && (
                  <span>
                    {' '}
                    and <span className="text-amber-400 font-bold">{dueSoonList.length} due</span> in the next{' '}
                    {reminderDays} days.
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/reminders')}
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20"
          >
            <span>Open Reminders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WELCOME & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            AIM Fitness <span className="text-aim-500">Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Welcome back to front desk management • Ratnagiri, Maharashtra
          </p>
        </div>

        {/* Quick buttons */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/admin/scan')}
            className="px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/25 flex items-center justify-center gap-1.5 transition-all"
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="truncate">Scan QR</span>
          </button>

          <button
            onClick={() => navigate('/admin/members/add')}
            className="px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-dark-850 hover:bg-dark-800 text-slate-200 border border-dark-750 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-aim-400 shrink-0" />
            <span className="truncate">Add Member</span>
          </button>

          <button
            onClick={() => navigate('/admin/fees')}
            className="px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-dark-850 hover:bg-dark-800 text-slate-200 border border-dark-750 flex items-center justify-center gap-1.5 transition-all"
          >
            <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Record Fee</span>
          </button>
        </div>
      </div>

      {/* BALANCED 4-CARD METRICS GRID (2x2 on mobile, 4 columns on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today's Check-ins */}
        <div
          onClick={() => navigate('/admin/attendance')}
          className="cursor-pointer p-4 rounded-2xl bg-dark-850 border border-dark-750 hover:border-aim-500/50 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-aim-400 truncate">Today Visits</span>
            <div className="p-2 rounded-xl bg-aim-500/10 text-aim-400 group-hover:scale-110 transition-transform shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{todayCheckins}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">Checked in today</div>
        </div>

        {/* Card 2: Active Members */}
        <div
          onClick={() => navigate('/admin/members')}
          className="cursor-pointer p-4 rounded-2xl bg-dark-850 border border-dark-750 hover:border-dark-600 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Active Members</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{activeMembers.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            <span>{members.length} total enrolled</span>
          </div>
        </div>

        {/* Card 3: This Month's Collection */}
        <div
          onClick={() => navigate('/admin/fees')}
          className="cursor-pointer p-4 rounded-2xl bg-dark-850 border border-dark-750 hover:border-dark-600 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Month Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 truncate">
            {formatCurrency(monthTotalCollection)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            <span>{monthPayments.length} transactions</span>
          </div>
        </div>

        {/* Card 4: Fee Alerts (Overdue & Due Soon) */}
        <div
          onClick={() => navigate('/admin/fees?tab=overdue')}
          className="cursor-pointer p-4 rounded-2xl bg-dark-850 border border-dark-750 hover:border-rose-500/40 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 truncate">Fee Attention</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 flex items-baseline gap-1.5">
            <span>{overdueList.length}</span>
            <span className="text-xs font-medium text-slate-400 font-sans">overdue</span>
          </div>
          <div className="text-[11px] text-amber-400 mt-1 truncate">
            <span>+{dueSoonList.length} due soon</span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: URGENT OVERDUE & RECENT PAYMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Overdue Section */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
              <h2 className="text-base font-bold text-white">Overdue Members</h2>
            </div>
            <button
              onClick={() => navigate('/admin/reminders')}
              className="text-xs text-aim-400 hover:text-aim-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {overdueList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-dark-900/50 rounded-xl border border-dark-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-white">No overdue members!</p>
              <p className="text-xs text-slate-400 mt-1">All active members are fully up to date on gym fees.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueList.slice(0, 5).map(({ member, feeInfo }) => {
                const message = formatTemplate(
                  gym?.template_fee_overdue ||
                    'Hi {name}, your AIM Fitness fees were due on {due_date}. Please pay at the front desk.',
                  {
                    name: member.full_name,
                    due_date: formatDate(member.current_due_date),
                    gym_name: 'AIM Fitness',
                    member_code: member.member_code,
                  }
                );

                return (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-dark-900 border border-dark-800 hover:border-rose-500/30 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-dark-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-sm">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{member.full_name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="font-mono text-slate-500">{member.member_code}</span>
                          <span className="text-rose-400 font-medium">{feeInfo.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={buildWhatsAppUrl(member.phone, message)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <a
                        href={buildCallUrl(member.phone)}
                        className="p-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                        title="Call Member"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setPaymentModalMember(member)}
                        className="px-2.5 py-1.5 rounded-lg bg-aim-500 hover:bg-aim-600 text-white text-xs font-bold shadow-sm"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments Feed */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Recent Fee Payments
            </h2>
            <button
              onClick={() => navigate('/admin/fees')}
              className="text-xs text-aim-400 hover:text-aim-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-dark-900/50 rounded-xl border border-dark-800">
              <CreditCard className="w-10 h-10 text-slate-500 mb-2" />
              <p className="text-sm font-semibold text-white">No payments recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Record a payment from the Fees tab or member profile.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payments.slice(0, 5).map((payment) => {
                const payingMember = members.find((m) => m.id === payment.member_id);
                return (
                  <div
                    key={payment.id}
                    className="p-3 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {payingMember?.full_name || 'Member'}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 text-slate-300 font-mono">
                          {payment.mode}
                        </span>
                        <span>{formatDate(payment.paid_on)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-400">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Until {formatDate(payment.period_end)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModalMember && (
        <RecordPaymentModal
          member={paymentModalMember}
          isOpen={Boolean(paymentModalMember)}
          onClose={() => setPaymentModalMember(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
