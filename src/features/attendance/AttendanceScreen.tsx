import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  QrCode,
  UserCheck,
  Clock,
  Calendar,
  Camera,
  Search,
} from 'lucide-react';
import { getAllAttendance, getAllMembers, getGymSettings } from '@/db/repository';
import { formatDate } from '@/lib/dateUtils';
import { computeFeeStatus } from '@/lib/feeStatus';
import type { Attendance, Member, Gym } from '@/types';

export const AttendanceScreen: React.FC = () => {
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [gym, setGym] = useState<Gym | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [att, m, g] = await Promise.all([
        getAllAttendance(),
        getAllMembers(),
        getGymSettings(),
      ]);
      setAttendance(att);
      setMembers(m);
      setGym(g || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reminderDays = gym?.reminder_days_before ?? 5;

  // Filter attendance by selectedDate
  const dateFiltered = attendance.filter((a) => a.checked_in_at.startsWith(selectedDate));

  // Search filter
  const displayedAttendance = dateFiltered.filter((a) => {
    if (!searchQuery.trim()) return true;
    const m = members.find((mem) => mem.id === a.member_id);
    if (!m) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.member_code.toLowerCase().includes(q)
    );
  });

  const qrCount = dateFiltered.filter((a) => a.method === 'qr').length;
  const manualCount = dateFiltered.filter((a) => a.method === 'manual').length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-aim-500" /> Member Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Track daily gym visits and check-in logs at AIM Fitness Ratnagiri
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/scan')}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Camera className="w-4 h-4" />
          <span>Open Camera Scanner</span>
        </button>
      </div>

      {/* Metric Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Check-Ins</span>
            <UserCheck className="w-4 h-4 text-aim-400" />
          </div>
          <div className="text-2xl font-black text-white">{dateFiltered.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            On {formatDate(selectedDate, 'dd MMMM yyyy')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">QR Code Scans</span>
            <QrCode className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">{qrCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Contactless member ID scans</div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Manual Entries</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{manualCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Front desk assisted check-ins</div>
        </div>
      </div>

      {/* Date Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Date Selector */}
        <div className="relative w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-dark-850 border border-dark-750 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-aim-500 font-semibold"
          />
        </div>

        {/* Quick Today button */}
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="px-3.5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-semibold border border-dark-700 whitespace-nowrap"
        >
          Today
        </button>

        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search member by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-850 border border-dark-750 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aim-500"
          />
        </div>
      </div>

      {/* ATTENDANCE TABLE */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : displayedAttendance.length === 0 ? (
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No check-in records</h3>
          <p className="text-xs text-slate-400 mt-1">
            No attendance entries found for {formatDate(selectedDate, 'dd MMM yyyy')}.
          </p>
          <button
            onClick={() => navigate('/admin/scan')}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-aim-500 text-white"
          >
            Start Scanning
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* MOBILE CARDS VIEW (Clean, touch-friendly on phone) */}
          <div className="block sm:hidden space-y-2.5">
            {displayedAttendance.map((record) => {
              const member = members.find((m) => m.id === record.member_id);
              const feeInfo = member ? computeFeeStatus(member, reminderDays) : null;

              return (
                <div
                  key={record.id}
                  className="bg-dark-850 border border-dark-750 rounded-2xl p-3.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer min-w-0"
                      onClick={() => member && navigate(`/admin/members/${member.id}`)}
                    >
                      {member?.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-dark-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-dark-750 text-aim-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {member?.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">
                          {member?.full_name || 'Unknown Member'}
                        </div>
                        <span className="font-mono text-xs text-aim-500 font-semibold">
                          {member?.member_code}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1 shrink-0 ${
                        record.method === 'qr'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                          : 'bg-dark-750 text-slate-300 border border-dark-700'
                      }`}
                    >
                      {record.method === 'qr' ? <QrCode className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      <span>{record.method === 'qr' ? 'QR Code' : 'Manual'}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-dark-900 rounded-xl px-3 py-2 border border-dark-800">
                    <div className="flex items-center gap-1.5 font-mono text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-aim-400" />
                      <span>{formatDate(record.checked_in_at, 'hh:mm:ss a')}</span>
                    </div>

                    {feeInfo && (
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${feeInfo.badgeClass}`}
                      >
                        {feeInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden sm:block bg-dark-850 border border-dark-750 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-dark-900/80 border-b border-dark-750 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Check-In Time</th>
                    <th className="py-3 px-3 font-semibold">Member</th>
                    <th className="py-3 px-3 font-semibold">Method</th>
                    <th className="py-3 px-3 font-semibold">Fee Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {displayedAttendance.map((record) => {
                    const member = members.find((m) => m.id === record.member_id);
                    const feeInfo = member
                      ? computeFeeStatus(member, reminderDays)
                      : null;

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-dark-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-white">
                          {formatDate(record.checked_in_at, 'hh:mm:ss a')}
                        </td>

                        <td className="py-3 px-3">
                          <div
                            className="flex items-center gap-2.5 cursor-pointer"
                            onClick={() => member && navigate(`/admin/members/${member.id}`)}
                          >
                            {member?.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={member.full_name}
                                className="w-8 h-8 rounded-lg object-cover border border-dark-700 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-dark-750 text-aim-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {member?.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white hover:text-aim-400 transition-colors">
                                {member?.full_name || 'Unknown Member'}
                              </div>
                              <span className="font-mono text-[10px] text-aim-500">
                                {member?.member_code}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1 ${
                              record.method === 'qr'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                : 'bg-dark-750 text-slate-300 border border-dark-700'
                            }`}
                          >
                            {record.method === 'qr' ? <QrCode className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            <span>{record.method === 'qr' ? 'QR Code' : 'Manual'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {feeInfo && (
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${feeInfo.badgeClass}`}
                            >
                              {feeInfo.status === 'paid' ? 'Paid' : feeInfo.status === 'due_soon' ? 'Due Soon' : 'Overdue'}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right text-slate-400">
                          {record.recorded_by || 'Front Desk'}
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
    </div>
  );
};
