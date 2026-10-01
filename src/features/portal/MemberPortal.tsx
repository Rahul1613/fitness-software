import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  QrCode,
  CalendarCheck,
  CreditCard,
  MessageCircle,
  Clock,
  ArrowLeft,
  Search,
  LogOut,
} from 'lucide-react';
import {
  getAllMembers,
  getMemberById,
  getAllPlans,
  getGymSettings,
  getAttendanceForMember,
  getPaymentsForMember,
} from '@/db/repository';
import { generateQrToken } from '@/lib/qrToken';
import { computeFeeStatus } from '@/lib/feeStatus';
import { formatCurrency, formatDate } from '@/lib/dateUtils';
import { buildWhatsAppUrl, cleanIndianPhone } from '@/lib/messageTemplates';
import type { Member, Plan, Gym, Attendance, Payment } from '@/types';

const PORTAL_MEMBER_KEY = 'aim_portal_member_id';

export const MemberPortal: React.FC = () => {
  const navigate = useNavigate();

  const [inputQuery, setInputQuery] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gym, setGym] = useState<Gym | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [searchError, setSearchError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Check saved session
  useEffect(() => {
    async function loadSaved() {
      const savedId = localStorage.getItem(PORTAL_MEMBER_KEY);
      if (savedId) {
        await loadMemberData(savedId);
      }
    }
    loadSaved();
  }, []);

  const loadMemberData = async (memberId: string) => {
    try {
      setLoading(true);
      const [m, allPlans, g, att, pay] = await Promise.all([
        getMemberById(memberId),
        getAllPlans(),
        getGymSettings(),
        getAttendanceForMember(memberId),
        getPaymentsForMember(memberId),
      ]);

      if (m && g) {
        setMember(m);
        setPlans(allPlans);
        setGym(g);
        setAttendance(att);
        setPayments(pay);
        localStorage.setItem(PORTAL_MEMBER_KEY, m.id);

        // Generate QR Code
        const token = await generateQrToken(g.id, m.id, g.qr_secret);
        const qrUrl = await QRCode.toDataURL(token, {
          width: 320,
          margin: 1,
          color: { dark: '#0f1117', light: '#ffffff' },
        });
        setQrDataUrl(qrUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');

    if (!inputQuery.trim()) return;

    const all = await getAllMembers();
    const cleanQuery = cleanIndianPhone(inputQuery.trim());
    const queryLower = inputQuery.trim().toLowerCase();

    const match = all.find(
      (m) =>
        m.phone === cleanQuery ||
        m.member_code.toLowerCase() === queryLower ||
        m.full_name.toLowerCase() === queryLower
    );

    if (match) {
      await loadMemberData(match.id);
    } else {
      setSearchError('No member found with this phone number or Member ID.');
    }
  };

  const handleLogout = () => {
    setMember(null);
    setQrDataUrl('');
    localStorage.removeItem(PORTAL_MEMBER_KEY);
  };

  // If member is not logged in: show phone / ID lookup screen
  if (!member) {
    return (
      <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12 animate-in fade-in">
        <div className="w-full max-w-md bg-dark-850 border border-dark-750 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-aim-500/20 border-2 border-aim-500/40 text-aim-500 font-black text-xl flex items-center justify-center mx-auto">
              AIM
            </div>
            <h1 className="text-2xl font-black text-white">Member Portal</h1>
            <p className="text-xs text-slate-400">
              AIM Fitness • Ratnagiri, Maharashtra
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Mobile Number or Member ID
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 9822XXXXXX or AIM-0001"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-aim-500 font-medium"
                />
              </div>
            </div>

            {searchError && (
              <p className="text-xs text-rose-400 text-center font-medium">{searchError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl text-xs sm:text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              <span>{loading ? 'Finding Account...' : 'View My Member Card'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-dark-750 flex items-center justify-between text-xs text-slate-400">
            <button onClick={() => navigate('/')} className="hover:text-white">
              ← Public Website
            </button>
            <button onClick={() => navigate('/admin')} className="hover:text-white">
              Staff Portal ➔
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find((p) => p.id === member.current_plan_id);
  const feeInfo = computeFeeStatus(member, gym?.reminder_days_before ?? 5);

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 p-4 sm:p-6 lg:p-8 animate-in fade-in">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Public Website</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>

        {/* DIGITAL MEMBER ID CARD WITH QR */}
        <div className="bg-gradient-to-b from-dark-850 to-dark-950 border-2 border-dark-750 rounded-3xl p-6 shadow-2xl text-center space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-aim-500/20 text-aim-500 font-black text-xs flex items-center justify-center">
                AIM
              </div>
              <span className="font-black text-sm tracking-wider text-white">AIM FITNESS</span>
            </div>
            <span className="font-mono text-xs text-aim-400 font-bold bg-aim-500/10 px-2 py-0.5 rounded border border-aim-500/20">
              {member.member_code}
            </span>
          </div>

          <div>
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.full_name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-dark-700 mx-auto shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-dark-800 border-2 border-dark-700 text-aim-500 font-black text-2xl flex items-center justify-center mx-auto">
                {member.full_name.charAt(0)}
              </div>
            )}
            <h2 className="text-xl font-black text-white mt-2.5">{member.full_name}</h2>
            <div className="mt-1">
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${feeInfo.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${feeInfo.dotClass}`}></span>
                <span>{feeInfo.label}</span>
              </span>
            </div>
          </div>

          {/* High-res QR code */}
          <div className="p-3 bg-white rounded-2xl max-w-[200px] mx-auto shadow-xl">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Member QR"
                className="w-full h-auto aspect-square object-contain"
              />
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Show this QR code to the front desk scanner for entry check-in.
          </p>
        </div>

        {/* PLAN & DUE DATE STATUS */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-aim-500" /> Plan & Renewal Details
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-slate-400 block">Current Plan</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {currentPlan?.name || 'General Membership'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-slate-400 block">Fee Due Date</span>
              <span className="text-sm font-bold text-aim-400 mt-0.5 block">
                {member.current_due_date ? formatDate(member.current_due_date) : 'No due date'}
              </span>
            </div>
          </div>

          {/* Direct WhatsApp Front Desk Contact */}
          <a
            href={buildWhatsAppUrl(
              gym?.phone || '9822123456',
              `Hi AIM Fitness, I am member ${member.full_name} (${member.member_code}). I would like to renew my gym membership.`
            )}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contact Front Desk for Renewal</span>
          </a>
        </div>

        {/* RECENT ATTENDANCE HISTORY */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-aim-500" /> My Recent Workouts
            </h3>
            <span className="text-xs font-mono text-slate-400">{attendance.length} check-ins</span>
          </div>

          {attendance.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No check-in visits recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {attendance.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between text-xs"
                >
                  <span className="text-white font-medium">
                    {formatDate(a.checked_in_at, 'dd MMMM yyyy')}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {formatDate(a.checked_in_at, 'hh:mm a')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAYMENT RECEIPTS */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Payment Receipts
            </h3>
            <span className="text-xs font-mono text-slate-400">{payments.length} receipts</span>
          </div>

          {payments.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No payment receipts found.</p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="text-white font-semibold">{formatDate(p.paid_on)}</div>
                    <div className="text-[11px] text-slate-400 uppercase font-mono">{p.mode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">{formatCurrency(p.amount)}</div>
                    <div className="text-[11px] text-slate-500">Until {formatDate(p.period_end)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
