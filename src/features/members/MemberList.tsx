import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { getAllMembers, getGymSettings } from '@/db/repository';
import { computeFeeStatus } from '@/lib/feeStatus';
import { formatDate } from '@/lib/dateUtils';
import { buildWhatsAppUrl, buildCallUrl, formatTemplate } from '@/lib/messageTemplates';
import type { Member, Gym } from '@/types';
import { RecordPaymentModal } from '@/components/RecordPaymentModal';

type FilterTab = 'all' | 'active' | 'due_soon' | 'overdue' | 'inactive';

export const MemberList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterTab) || 'all';

  const [members, setMembers] = useState<Member[]>([]);
  const [gym, setGym] = useState<Gym | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>(initialFilter);
  const [loading, setLoading] = useState(true);

  const [paymentModalMember, setPaymentModalMember] = useState<Member | null>(null);

  const loadData = async () => {
    try {
      const [allMembers, gymSettings] = await Promise.all([
        getAllMembers(),
        getGymSettings(),
      ]);
      setMembers(allMembers);
      setGym(gymSettings || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reminderDays = gym?.reminder_days_before ?? 5;

  // Compute status for all members
  const membersWithStatus = members.map((m) => ({
    member: m,
    feeInfo: computeFeeStatus(m, reminderDays),
  }));

  // Filter based on activeTab and searchQuery
  const filtered = membersWithStatus.filter(({ member, feeInfo }) => {
    // Tab filter
    if (activeTab === 'active' && member.status !== 'active') return false;
    if (activeTab === 'inactive' && member.status !== 'inactive') return false;
    if (activeTab === 'due_soon' && feeInfo.status !== 'due_soon') return false;
    if (activeTab === 'overdue' && feeInfo.status !== 'overdue') return false;

    // Search filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      member.full_name.toLowerCase().includes(q) ||
      member.phone.includes(q) ||
      member.member_code.toLowerCase().includes(q)
    );
  });

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'all' ? {} : { filter: tab });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-aim-500" /> Members Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {members.length} registered members at AIM Fitness Ratnagiri
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/members/add')}
          className="px-4 py-2.5 rounded-xl text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/25 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Member</span>
        </button>
      </div>

      {/* Search and Filter Tabs */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, phone (e.g. 9822...), or code (e.g. AIM-0001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-850 border border-dark-750 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-aim-500 focus:ring-1 focus:ring-aim-500 shadow-inner"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { id: 'all', label: 'All', count: members.length },
              {
                id: 'active',
                label: 'Active',
                count: members.filter((m) => m.status === 'active').length,
              },
              {
                id: 'due_soon',
                label: 'Due Soon',
                count: membersWithStatus.filter((x) => x.feeInfo.status === 'due_soon').length,
              },
              {
                id: 'overdue',
                label: 'Overdue',
                count: membersWithStatus.filter((x) => x.feeInfo.status === 'overdue').length,
              },
              {
                id: 'inactive',
                label: 'Inactive',
                count: members.filter((m) => m.status === 'inactive').length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-aim-500 text-white shadow-sm'
                  : 'bg-dark-850 text-slate-400 hover:text-slate-200 border border-dark-750'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === tab.id ? 'bg-black/20 text-white' : 'bg-dark-750 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Member Cards / Rows */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No members found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? `No members match "${searchQuery}" in this filter.`
              : 'Start by registering the first AIM Fitness member.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/admin/members/add')}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-aim-500 text-white"
            >
              Register Member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(({ member, feeInfo }) => {
            const message = formatTemplate(
              feeInfo.status === 'overdue'
                ? gym?.template_fee_overdue ||
                    'Hi {name}, your AIM Fitness gym fees are overdue. Please pay at the front desk.'
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
                className="bg-dark-850 border border-dark-750 hover:border-dark-650 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Top info row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer min-w-0"
                      onClick={() => navigate(`/admin/members/${member.id}`)}
                    >
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.full_name}
                          className="w-12 h-12 rounded-xl object-cover border border-dark-700 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-dark-750 border border-dark-700 flex items-center justify-center font-bold text-aim-400 text-base shrink-0">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-aim-400 transition-colors truncate">
                          {member.full_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs text-aim-500 font-semibold">
                            {member.member_code}
                          </span>
                          <span className="text-slate-500 text-xs">•</span>
                          <span className="text-xs text-slate-400">{member.phone}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border shrink-0 ${feeInfo.badgeClass}`}
                    >
                      {feeInfo.status === 'due_soon'
                        ? 'Due Soon'
                        : feeInfo.status === 'overdue'
                        ? 'Overdue'
                        : feeInfo.status === 'paid'
                        ? 'Paid'
                        : 'Inactive'}
                    </span>
                  </div>

                  {/* Due Date & Sub-status */}
                  <div className="bg-dark-900 rounded-xl p-2.5 text-xs flex items-center justify-between mb-3 border border-dark-800">
                    <span className="text-slate-400">Due Date:</span>
                    <span className="font-medium text-slate-200">
                      {member.current_due_date ? formatDate(member.current_due_date) : 'No plan active'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-dark-750/70 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <a
                      href={buildWhatsAppUrl(member.phone, message)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="WhatsApp Reminder"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    <a
                      href={buildCallUrl(member.phone)}
                      className="p-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                      title="Phone Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPaymentModalMember(member)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-dark-750 hover:bg-dark-700 text-slate-200 border border-dark-650 flex items-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-aim-400" />
                      <span>Pay</span>
                    </button>
                    <button
                      onClick={() => navigate(`/admin/members/${member.id}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-750"
                      title="View Member Profile"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
