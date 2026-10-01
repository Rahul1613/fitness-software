import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  Clock,
  MessageCircle,
  MessageSquare,
  Phone,
  CheckCircle2,
  ChevronRight,
  Send,
  X,
} from 'lucide-react';
import {
  getAllMembers,
  getAllPlans,
  getGymSettings,
  logReminder,
  hasBeenRemindedToday,
} from '@/db/repository';
import { computeFeeStatus } from '@/lib/feeStatus';
import { formatDate } from '@/lib/dateUtils';
import {
  buildWhatsAppUrl,
  buildSmsUrl,
  buildCallUrl,
  formatTemplate,
} from '@/lib/messageTemplates';
import type { Member, Gym, Plan, ReminderChannel } from '@/types';
import { useAuth } from '@/app/AuthContext';

interface MemberReminderRow {
  member: Member;
  plan?: Plan;
  feeInfo: ReturnType<typeof computeFeeStatus>;
  remindedToday: boolean;
}

export const RemindersScreen: React.FC = () => {
  const { userRole } = useAuth();
  const [gym, setGym] = useState<Gym | null>(null);
  const [reminderRows, setReminderRows] = useState<MemberReminderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // "Remind all overdue" wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardIndex, setWizardIndex] = useState(0);

  const loadData = async () => {
    try {
      const [allMembers, allPlans, gymSettings] = await Promise.all([
        getAllMembers(),
        getAllPlans(),
        getGymSettings(),
      ]);
      setGym(gymSettings || null);

      const reminderDays = gymSettings?.reminder_days_before ?? 5;
      const activeMembers = allMembers.filter((m) => m.status === 'active');

      const rows: MemberReminderRow[] = [];
      for (const m of activeMembers) {
        const feeInfo = computeFeeStatus(m, reminderDays);
        if (feeInfo.status === 'overdue' || feeInfo.status === 'due_soon') {
          const remindedToday = await hasBeenRemindedToday(m.id);
          const plan = allPlans.find((p) => p.id === m.current_plan_id);
          rows.push({
            member: m,
            plan,
            feeInfo,
            remindedToday,
          });
        }
      }

      // Sort: Overdue first (sorted by most late -> smallest daysDiff), then Due soon (sorted by soonest -> smallest daysDiff)
      rows.sort((a, b) => {
        if (a.feeInfo.status === 'overdue' && b.feeInfo.status !== 'overdue') return -1;
        if (a.feeInfo.status !== 'overdue' && b.feeInfo.status === 'overdue') return 1;
        return a.feeInfo.daysDiff - b.feeInfo.daysDiff;
      });

      setReminderRows(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const overdueRows = reminderRows.filter((r) => r.feeInfo.status === 'overdue');
  const dueSoonRows = reminderRows.filter((r) => r.feeInfo.status === 'due_soon');

  // Trigger communication and log
  const handleAction = async (row: MemberReminderRow, channel: ReminderChannel) => {
    await logReminder({
      member_id: row.member.id,
      type: row.feeInfo.status === 'overdue' ? 'overdue' : 'due_soon',
      channel,
      sent_at: new Date().toISOString(),
      sent_by: userRole,
    });

    // Update local row state to reflect "Reminded today"
    setReminderRows((prev) =>
      prev.map((r) => (r.member.id === row.member.id ? { ...r, remindedToday: true } : r))
    );
  };

  const getMessageText = (row: MemberReminderRow) => {
    const isOverdue = row.feeInfo.status === 'overdue';
    const template = isOverdue
      ? gym?.template_fee_overdue ||
        'Hi {name}, your AIM Fitness membership fees of ₹{amount} were due on {due_date}. Please pay at the earliest. Thank you!'
      : gym?.template_fee_due ||
        'Hi {name}, your AIM Fitness fees of ₹{amount} are due on {due_date} ({days_left} days left). Thank you!';

    const daysLeft = Math.max(0, row.feeInfo.daysDiff);
    return formatTemplate(template, {
      name: row.member.full_name,
      amount: row.plan?.price || '',
      due_date: formatDate(row.member.current_due_date),
      gym_name: 'AIM Fitness',
      days_left: daysLeft,
      member_code: row.member.member_code,
    });
  };

  // Wizard current row
  const wizardRow = overdueRows[wizardIndex];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BellRing className="w-6 h-6 text-aim-500" /> Fee Reminders
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            One-tap WhatsApp, SMS (offline SIM), and Phone Call reminder dispatch
          </p>
        </div>

        {overdueRows.length > 0 && (
          <button
            onClick={() => {
              setWizardIndex(0);
              setWizardOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <Send className="w-4 h-4" />
            <span>Remind All Overdue ({overdueRows.length})</span>
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Overdue ({overdueRows.length})
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{overdueRows.length} Members</div>
          <div className="text-[11px] text-slate-400 mt-1">Listed first by days late</div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Due Soon ({dueSoonRows.length})
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{dueSoonRows.length} Members</div>
          <div className="text-[11px] text-slate-400 mt-1">Due in next {gym?.reminder_days_before ?? 5} days</div>
        </div>
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reminderRows.length === 0 ? (
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">All fees are up to date!</h3>
          <p className="text-xs text-slate-400 mt-1">
            No active members have overdue or upcoming pending fees at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminderRows.map((row) => {
            const message = getMessageText(row);
            return (
              <div
                key={row.member.id}
                className={`p-4 rounded-2xl bg-dark-850 border transition-all ${
                  row.feeInfo.status === 'overdue'
                    ? 'border-rose-500/30 hover:border-rose-500/50'
                    : 'border-amber-500/30 hover:border-amber-500/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Member info */}
                  <div className="flex items-start gap-3 min-w-0">
                    {row.member.photo_url ? (
                      <img
                        src={row.member.photo_url}
                        alt={row.member.full_name}
                        className="w-12 h-12 rounded-xl object-cover border border-dark-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-dark-750 text-aim-400 flex items-center justify-center font-bold text-base shrink-0">
                        {row.member.full_name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-sm">{row.member.full_name}</h3>
                        <span className="font-mono text-xs text-aim-500 font-semibold">
                          {row.member.member_code}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${row.feeInfo.badgeClass}`}
                        >
                          {row.feeInfo.label}
                        </span>
                        {row.remindedToday && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ✓ Reminded Today
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>Due: {formatDate(row.member.current_due_date)}</span>
                        <span>•</span>
                        <span>+91 {row.member.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Reminder Action Buttons */}
                  <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                    {/* WhatsApp */}
                    <a
                      href={buildWhatsAppUrl(row.member.phone, message)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleAction(row, 'whatsapp')}
                      className="px-2.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      title="Open WhatsApp with pre-filled message"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">WhatsApp</span>
                    </a>

                    {/* SMS (offline SIM) */}
                    <a
                      href={buildSmsUrl(row.member.phone, message)}
                      onClick={() => handleAction(row, 'sms')}
                      className="px-2.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      title="Send SMS using phone SIM"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate">SMS</span>
                    </a>

                    {/* Phone Call */}
                    <a
                      href={buildCallUrl(row.member.phone)}
                      onClick={() => handleAction(row, 'call')}
                      className="px-2.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      title="Call Member"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span className="sm:hidden truncate">Call</span>
                    </a>
                  </div>
                </div>

                {/* Message preview snippet */}
                <div className="mt-2.5 p-2 rounded-xl bg-dark-900 border border-dark-800 text-[11px] text-slate-300 font-mono">
                  &ldquo;{message}&rdquo;
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "REMIND ALL OVERDUE" STEP-THROUGH MODAL WIZARD */}
      {wizardOpen && wizardRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-dark-850 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-dark-750 flex items-center justify-between bg-dark-900">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-aim-500" /> Overdue Reminder Wizard
                </h3>
                <p className="text-xs text-slate-400">
                  Step {wizardIndex + 1} of {overdueRows.length} overdue members
                </p>
              </div>
              <button
                onClick={() => setWizardOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-dark-900 border border-dark-750 flex items-center gap-4">
                {wizardRow.member.photo_url ? (
                  <img
                    src={wizardRow.member.photo_url}
                    alt={wizardRow.member.full_name}
                    className="w-14 h-14 rounded-xl object-cover border border-dark-700 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-dark-750 text-aim-400 flex items-center justify-center font-bold text-lg shrink-0">
                    {wizardRow.member.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-base font-bold text-white">{wizardRow.member.full_name}</h4>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-aim-500 font-semibold">
                      {wizardRow.member.member_code}
                    </span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">{wizardRow.feeInfo.label}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">+91 {wizardRow.member.phone}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Message Preview
                </label>
                <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-xs text-slate-200 font-mono">
                  {getMessageText(wizardRow)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={buildWhatsAppUrl(wizardRow.member.phone, getMessageText(wizardRow))}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleAction(wizardRow, 'whatsapp')}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send WhatsApp to {wizardRow.member.full_name}</span>
                </a>

                <a
                  href={buildSmsUrl(wizardRow.member.phone, getMessageText(wizardRow))}
                  onClick={() => handleAction(wizardRow, 'sms')}
                  className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-violet-400" />
                  <span>Send SMS (SIM)</span>
                </a>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-4 border-t border-dark-750 bg-dark-900 flex items-center justify-between">
              <button
                disabled={wizardIndex === 0}
                onClick={() => setWizardIndex((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40"
              >
                Previous
              </button>

              {wizardIndex < overdueRows.length - 1 ? (
                <button
                  onClick={() => setWizardIndex((prev) => prev + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white flex items-center gap-1.5 shadow-md shadow-aim-500/20"
                >
                  <span>Next Member</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setWizardOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white"
                >
                  Finished All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
