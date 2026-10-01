import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  MessageCircle,
} from 'lucide-react';
import { getAllMembers, getAllPayments, getGymSettings } from '@/db/repository';
import { computeFeeStatus } from '@/lib/feeStatus';
import { formatCurrency, formatDate } from '@/lib/dateUtils';
import { buildWhatsAppUrl, formatTemplate } from '@/lib/messageTemplates';
import type { Member, Payment, Gym } from '@/types';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';

type FeeTab = 'paid' | 'due_soon' | 'overdue';

export const FeesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as FeeTab) || 'due_soon';

  const [activeTab, setActiveTab] = useState<FeeTab>(initialTab);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gym, setGym] = useState<Gym | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [paymentModalMember, setPaymentModalMember] = useState<Member | null>(null);

  const loadData = async () => {
    try {
      const [m, p, g] = await Promise.all([
        getAllMembers(),
        getAllPayments(),
        getGymSettings(),
      ]);
      setMembers(m);
      setPayments(p);
      setGym(g || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reminderDays = gym?.reminder_days_before ?? 5;

  // Compute status for all active members
  const activeMembers = members.filter((m) => m.status === 'active');
  const categorized = activeMembers.map((m) => ({
    member: m,
    feeInfo: computeFeeStatus(m, reminderDays),
  }));

  const paidList = categorized.filter((c) => c.feeInfo.status === 'paid');
  const dueSoonList = categorized
    .filter((c) => c.feeInfo.status === 'due_soon')
    .sort((a, b) => a.feeInfo.daysDiff - b.feeInfo.daysDiff);
  const overdueList = categorized
    .filter((c) => c.feeInfo.status === 'overdue')
    .sort((a, b) => a.feeInfo.daysDiff - b.feeInfo.daysDiff);

  // Month collection
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const monthPayments = payments.filter((p) => p.paid_on.startsWith(currentMonthPrefix));
  const monthTotalCollection = monthPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  // Pick current tab list
  let currentList = dueSoonList;
  if (activeTab === 'paid') currentList = paidList;
  if (activeTab === 'overdue') currentList = overdueList;

  // Search filter
  const filteredList = currentList.filter(({ member }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      member.full_name.toLowerCase().includes(q) ||
      member.phone.includes(q) ||
      member.member_code.toLowerCase().includes(q)
    );
  });

  const handleTabChange = (tab: FeeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-aim-500" /> Membership Fee Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Track payments, upcoming renewals, and overdue fees for AIM Fitness
        </p>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Month Collection</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatCurrency(monthTotalCollection)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{monthPayments.length} transactions</div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Overdue Dues</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{overdueList.length}</div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">Members past due date</div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Due Soon</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{dueSoonList.length}</div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">Next {reminderDays} days window</div>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-dark-750 pb-2">
          <button
            onClick={() => handleTabChange('due_soon')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'due_soon'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Due Soon</span>
            <span className="px-1.5 py-0.2 rounded-full bg-dark-750 text-slate-300 text-xs">
              {dueSoonList.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('overdue')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overdue'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Overdue</span>
            <span className="px-1.5 py-0.2 rounded-full bg-dark-750 text-slate-300 text-xs">
              {overdueList.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('paid')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'paid'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Paid / Active</span>
            <span className="px-1.5 py-0.2 rounded-full bg-dark-750 text-slate-300 text-xs">
              {paidList.length}
            </span>
          </button>
        </div>

        {/* Search inside fees */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search member by name, code, or phone in this tab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-850 border border-dark-750 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-aim-500 focus:ring-1 focus:ring-aim-500"
          />
        </div>
      </div>

      {/* TABLE / LIST OF MEMBERS WITH "RECORD PAYMENT" ON EVERY ROW */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No members in this tab</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? `No members match "${searchQuery}" in this view.`
              : `All active members are clear of this category.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* MOBILE CARDS VIEW (Clean, touch-friendly on phone) */}
          <div className="block md:hidden space-y-3">
            {filteredList.map(({ member, feeInfo }) => {
              const message = formatTemplate(
                feeInfo.status === 'overdue'
                  ? gym?.template_fee_overdue ||
                      'Hi {name}, your AIM Fitness fees are overdue. Please pay at the front desk.'
                  : gym?.template_fee_due ||
                      'Hi {name}, your AIM Fitness fees are due on {due_date}. Please pay at the front desk.',
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
                  className="bg-dark-850 border border-dark-750 rounded-2xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex items-center gap-3 cursor-pointer min-w-0"
                      onClick={() => navigate(`/admin/members/${member.id}`)}
                    >
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.full_name}
                          className="w-11 h-11 rounded-xl object-cover border border-dark-700 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-dark-750 text-aim-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">
                          {member.full_name}
                        </div>
                        <div className="font-mono text-xs text-aim-500 font-semibold">
                          {member.member_code}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 shrink-0 ${feeInfo.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${feeInfo.dotClass}`}></span>
                      <span>{feeInfo.label}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-dark-900 rounded-xl p-2.5 border border-dark-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Due Date</span>
                      <span className="font-semibold text-slate-200">
                        {member.current_due_date ? formatDate(member.current_due_date) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Phone</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-300 font-mono text-[11px]">{member.phone}</span>
                        <a
                          href={buildWhatsAppUrl(member.phone, message)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded text-emerald-400 bg-emerald-500/10"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setPaymentModalMember(member)}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-md shadow-aim-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-dark-850 border border-dark-750 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-dark-900/80 border-b border-dark-750 text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Member</th>
                    <th className="py-3.5 px-3 font-semibold">Contact</th>
                    <th className="py-3.5 px-3 font-semibold">Due Date</th>
                    <th className="py-3.5 px-3 font-semibold">Fee Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {filteredList.map(({ member, feeInfo }) => {
                    const message = formatTemplate(
                      feeInfo.status === 'overdue'
                        ? gym?.template_fee_overdue ||
                            'Hi {name}, your AIM Fitness fees are overdue. Please pay at the front desk.'
                        : gym?.template_fee_due ||
                            'Hi {name}, your AIM Fitness fees are due on {due_date}. Please pay at the front desk.',
                      {
                        name: member.full_name,
                        due_date: formatDate(member.current_due_date),
                        gym_name: 'AIM Fitness',
                        member_code: member.member_code,
                      }
                    );

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-dark-800/50 transition-colors group"
                      >
                        {/* Member Info */}
                        <td className="py-3 px-4">
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => navigate(`/admin/members/${member.id}`)}
                          >
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={member.full_name}
                                className="w-10 h-10 rounded-xl object-cover border border-dark-700 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-dark-750 text-aim-400 flex items-center justify-center font-bold text-sm shrink-0">
                                {member.full_name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-white text-sm group-hover:text-aim-400 transition-colors truncate">
                                {member.full_name}
                              </div>
                              <span className="font-mono text-[11px] text-aim-500 font-semibold">
                                {member.member_code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-300 font-medium">{member.phone}</span>
                            <a
                              href={buildWhatsAppUrl(member.phone, message)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-3 font-medium text-slate-200">
                          {member.current_due_date ? formatDate(member.current_due_date) : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 ${feeInfo.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${feeInfo.dotClass}`}></span>
                            <span>{feeInfo.label}</span>
                          </span>
                        </td>

                        {/* Record payment on every row */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setPaymentModalMember(member)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-md shadow-aim-500/20 flex items-center gap-1.5 ml-auto transition-all"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
