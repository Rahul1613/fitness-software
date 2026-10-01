import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MessageSquare,
  CreditCard,
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
  User,
  QrCode,
} from 'lucide-react';
import {
  getMemberById,
  getPaymentsForMember,
  getAllPlans,
  getGymSettings,
  softDeleteMember,
  logReminder,
} from '@/db/repository';
import { computeFeeStatus } from '@/lib/feeStatus';
import { formatCurrency, formatDate } from '@/lib/dateUtils';
import {
  buildWhatsAppUrl,
  buildSmsUrl,
  buildCallUrl,
  formatTemplate,
} from '@/lib/messageTemplates';
import type { Member, Payment, Plan, Gym } from '@/types';
import { useAuth } from '@/app/AuthContext';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';

export const MemberProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [m, p, allPlans, g] = await Promise.all([
        getMemberById(id),
        getPaymentsForMember(id),
        getAllPlans(),
        getGymSettings(),
      ]);
      setMember(m || null);
      setPayments(p);
      setPlans(allPlans);
      setGym(g || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Member not found</h2>
        <p className="text-xs text-slate-400 mt-1">This member does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/admin/members')}
          className="mt-4 px-4 py-2 bg-aim-500 text-white rounded-xl text-xs font-bold"
        >
          Return to Members
        </button>
      </div>
    );
  }

  const reminderDays = gym?.reminder_days_before ?? 5;
  const feeInfo = computeFeeStatus(member, reminderDays);
  const currentPlan = plans.find((p) => p.id === member.current_plan_id);

  const reminderTemplate =
    feeInfo.status === 'overdue'
      ? gym?.template_fee_overdue ||
        'Hi {name}, your AIM Fitness gym fees are overdue. Please pay at the front desk. Thank you!'
      : gym?.template_fee_due ||
        'Hi {name}, your AIM Fitness gym fees of ₹{amount} are due on {due_date}. Thank you!';

  const formattedMsg = formatTemplate(reminderTemplate, {
    name: member.full_name,
    amount: currentPlan?.price || '',
    due_date: formatDate(member.current_due_date),
    gym_name: 'AIM Fitness',
    member_code: member.member_code,
  });

  const handleReminderClick = async (channel: 'whatsapp' | 'sms' | 'call') => {
    if (!member) return;
    await logReminder({
      member_id: member.id,
      type: feeInfo.status === 'overdue' ? 'overdue' : 'due_soon',
      channel,
      sent_at: new Date().toISOString(),
      sent_by: userRole,
    });
  };

  const handleDelete = async () => {
    if (userRole !== 'owner') {
      alert('Only the gym owner has permission to delete member records.');
      return;
    }
    if (confirm(`Are you sure you want to delete member ${member.full_name}?`)) {
      await softDeleteMember(member.id);
      navigate('/admin/members');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/members')}
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Members</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/members/${member.id}/card`)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-aim-500/15 hover:bg-aim-500/25 text-aim-400 border border-aim-500/30 flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>ID Card / QR</span>
          </button>

          <button
            onClick={() => navigate(`/admin/members/edit/${member.id}`)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 flex items-center gap-1.5 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          {/* Delete member button: only for owner */}
          {userRole === 'owner' && (
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
              title="Only Owner can delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* MEMBER HEADER CARD */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.full_name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-dark-700 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-dark-800 border-2 border-dark-700 text-aim-500 flex items-center justify-center font-black text-2xl shrink-0">
                {member.full_name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white">{member.full_name}</h1>
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${feeInfo.badgeClass}`}
                >
                  {feeInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                <span className="text-aim-400 font-bold bg-aim-500/10 px-2 py-0.5 rounded border border-aim-500/20">
                  {member.member_code}
                </span>
                <span>•</span>
                <span>Joined {formatDate(member.join_date)}</span>
              </div>
            </div>
          </div>

          {/* Quick Pay Action */}
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/30 flex items-center justify-center gap-2 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>

        {/* COMMUNICATION BAR */}
        <div className="mt-5 pt-4 border-t border-dark-750 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-400">
            Contact: <strong className="text-slate-200">+91 {member.phone}</strong>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={buildWhatsAppUrl(member.phone, formattedMsg)}
              target="_blank"
              rel="noreferrer"
              onClick={() => handleReminderClick('whatsapp')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Reminder</span>
            </a>

            <a
              href={buildSmsUrl(member.phone, formattedMsg)}
              onClick={() => handleReminderClick('sms')}
              className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS</span>
            </a>

            <a
              href={buildCallUrl(member.phone)}
              onClick={() => handleReminderClick('call')}
              className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
          </div>
        </div>
      </div>

      {/* TWO COLUMN DETAIL GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Membership Details */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-aim-500" /> Current Plan Status
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-dark-800">
              <span className="text-slate-400">Current Plan</span>
              <span className="text-white font-semibold">{currentPlan?.name || 'No Plan Active'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dark-800">
              <span className="text-slate-400">Plan Duration</span>
              <span className="text-white font-medium">
                {currentPlan ? `${currentPlan.duration_months} Months` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dark-800">
              <span className="text-slate-400">Fee Due Date</span>
              <span className="text-aim-400 font-bold">
                {member.current_due_date ? formatDate(member.current_due_date) : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Account Status</span>
              <span className="text-white font-medium capitalize">{member.status}</span>
            </div>
          </div>
        </div>

        {/* Personal & Emergency Details */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <User className="w-4 h-4 text-aim-500" /> Personal Information
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-dark-800">
              <span className="text-slate-400">Gender</span>
              <span className="text-white font-medium capitalize">{member.gender || '—'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dark-800">
              <span className="text-slate-400">Date of Birth</span>
              <span className="text-white font-medium">{formatDate(member.date_of_birth)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dark-800">
              <span className="text-slate-400">Ratnagiri Area</span>
              <span className="text-white font-medium">{member.address || '—'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Emergency Contact</span>
              <span className="text-white font-medium">{member.emergency_contact || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Member Notes */}
      {member.notes && (
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-4 text-xs">
          <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Fitness Notes</div>
          <p className="text-slate-200">{member.notes}</p>
        </div>
      )}

      {/* PAYMENT HISTORY TABLE */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" /> Payment & Renewal History
          </h2>
          <span className="text-xs text-slate-400">{payments.length} transactions</span>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No payments recorded yet for this member.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-750 text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5 font-semibold">Date</th>
                  <th className="pb-2.5 font-semibold">Amount</th>
                  <th className="pb-2.5 font-semibold">Mode</th>
                  <th className="pb-2.5 font-semibold">Valid Period</th>
                  <th className="pb-2.5 font-semibold">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-dark-800/40 transition-colors">
                    <td className="py-2.5 font-medium text-white">{formatDate(p.paid_on)}</td>
                    <td className="py-2.5 font-bold text-emerald-400">{formatCurrency(p.amount)}</td>
                    <td className="py-2.5">
                      <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 text-slate-300">
                        {p.mode}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">
                      {formatDate(p.period_start, 'dd MMM')} → {formatDate(p.period_end, 'dd MMM yyyy')}
                    </td>
                    <td className="py-2.5 text-slate-400">{p.received_by || 'Front Desk'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <RecordPaymentModal
          member={member}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
