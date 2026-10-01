import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import {
  getAllPayments,
  getAllMembers,
  getAllAttendance,
} from '@/db/repository';
import { formatCurrency, formatDate } from '@/lib/dateUtils';
import type { Payment, Member, Attendance } from '@/types';
import { useAuth } from '@/app/AuthContext';

export const ReportsScreen: React.FC = () => {
  const { userRole } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, m, a] = await Promise.all([
          getAllPayments(),
          getAllMembers(),
          getAllAttendance(),
        ]);
        setPayments(p);
        setMembers(m);
        setAttendance(a);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (userRole !== 'owner') {
    return (
      <div className="bg-dark-850 border border-rose-500/30 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Owner Access Required</h2>
        <p className="text-xs text-slate-300">
          Financial performance reports and analytics are restricted to the gym owner.
        </p>
      </div>
    );
  }

  // 1. Group revenue by month (last 6 months)
  const monthlyRevenue: Record<string, number> = {};
  payments.forEach((p) => {
    const month = p.paid_on.substring(0, 7); // YYYY-MM
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(p.amount);
  });
  const sortedRevenueMonths = Object.keys(monthlyRevenue).sort().reverse().slice(0, 6);

  // Total Lifetime Collection
  const totalLifetimeRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  // 2. Group new members by month
  const monthlyMembers: Record<string, number> = {};
  members.forEach((m) => {
    const month = m.join_date.substring(0, 7);
    monthlyMembers[month] = (monthlyMembers[month] || 0) + 1;
  });

  // 3. Payment Mode breakdown
  const modeBreakdown: Record<string, { count: number; total: number }> = {};
  payments.forEach((p) => {
    const mode = p.mode || 'other';
    if (!modeBreakdown[mode]) {
      modeBreakdown[mode] = { count: 0, total: 0 };
    }
    modeBreakdown[mode].count += 1;
    modeBreakdown[mode].total += Number(p.amount);
  });

  // 4. Attendance Metrics
  const totalVisits = attendance.length;
  const qrVisits = attendance.filter((a) => a.method === 'qr').length;
  const manualVisits = attendance.filter((a) => a.method === 'manual').length;
  const qrPercentage = totalVisits > 0 ? Math.round((qrVisits / totalVisits) * 100) : 0;

  // EXPORT REPORTS TO EXCEL
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['AIM Fitness - Financial & Operational Report'],
      ['Generated On', formatDate(new Date().toISOString(), 'yyyy-MM-dd hh:mm a')],
      ['Total Lifetime Revenue (INR)', totalLifetimeRevenue],
      ['Total Registered Members', members.length],
      ['Total Recorded Check-Ins', totalVisits],
      ['QR Check-In Percentage', `${qrPercentage}%`],
      [],
      ['Monthly Revenue Breakdown'],
      ['Month', 'Revenue (INR)'],
      ...sortedRevenueMonths.map((m) => [m, monthlyRevenue[m]]),
      [],
      ['Payment Mode Breakdown'],
      ['Mode', 'Transactions Count', 'Total Collected (INR)'],
      ...Object.entries(modeBreakdown).map(([mode, data]) => [
        mode.toUpperCase(),
        data.count,
        data.total,
      ]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    XLSX.writeFile(
      wb,
      `AIM_Fitness_Report_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // EXPORT REPORTS TO PDF
  const handleExportPdf = () => {
    const pdf = new jsPDF();

    // Header
    pdf.setFillColor(15, 17, 23);
    pdf.rect(0, 0, 210, 297, 'F');

    pdf.setTextColor(249, 115, 22);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('AIM FITNESS • RATNAGIRI', 14, 20);

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.text('Executive Management & Revenue Report', 14, 28);

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Generated: ${formatDate(new Date().toISOString(), 'dd MMMM yyyy, hh:mm a')}`, 14, 34);

    // Summary Box
    pdf.setFillColor(26, 30, 43);
    pdf.roundedRect(14, 40, 182, 28, 3, 3, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.text('Total Revenue Collected:', 20, 50);
    pdf.setTextColor(16, 185, 129);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(totalLifetimeRevenue), 20, 60);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.text('Total Members:', 85, 50);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(members.length), 85, 60);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Total Visits:', 140, 50);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(totalVisits), 140, 60);

    // Monthly Revenue Table
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(249, 115, 22);
    pdf.setFontSize(11);
    pdf.text('Monthly Revenue Trend', 14, 82);

    let y = 92;
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Month', 16, y);
    pdf.text('Amount (INR)', 120, y);
    y += 4;
    pdf.setDrawColor(38, 44, 62);
    pdf.line(14, y, 196, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 255, 255);
    sortedRevenueMonths.forEach((month) => {
      pdf.text(month, 16, y);
      pdf.text(formatCurrency(monthlyRevenue[month]), 120, y);
      y += 8;
    });

    // Payment Modes Table
    y += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(249, 115, 22);
    pdf.setFontSize(11);
    pdf.text('Payment Modes Distribution', 14, y);
    y += 10;

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Mode', 16, y);
    pdf.text('Transactions', 80, y);
    pdf.text('Total Collected', 140, y);
    y += 4;
    pdf.line(14, y, 196, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 255, 255);
    Object.entries(modeBreakdown).forEach(([mode, d]) => {
      pdf.text(mode.toUpperCase(), 16, y);
      pdf.text(String(d.count), 80, y);
      pdf.text(formatCurrency(d.total), 140, y);
      y += 8;
    });

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text('AIM Fitness • Ratnagiri, Maharashtra • Confidential Management Report', 14, 285);

    pdf.save(`AIM_Fitness_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-aim-500" /> Analytics & Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Revenue performance, member registration trends, and attendance statistics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/25 flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Lifetime Collection</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {formatCurrency(totalLifetimeRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{payments.length} total payments</div>
        </div>

        <div className="p-5 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{members.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {members.filter((m) => m.status === 'active').length} currently active
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-dark-850 border border-dark-750">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Visits</span>
            <CalendarCheck className="w-4 h-4 text-aim-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalVisits}</div>
          <div className="text-[11px] text-slate-400 mt-1">{qrPercentage}% via QR scan</div>
        </div>
      </div>

      {/* TWO COLUMN GRID: MONTHLY REVENUE & PAYMENT MODES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Breakdown */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-aim-500" /> Monthly Collection History
          </h2>

          {sortedRevenueMonths.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No revenue transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRevenueMonths.map((month) => {
                const amount = monthlyRevenue[month];
                const maxAmount = Math.max(...Object.values(monthlyRevenue), 1);
                const percent = Math.min(100, Math.round((amount / maxAmount) * 100));

                return (
                  <div key={month} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-semibold">{month}</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-dark-900 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-aim-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Modes Breakdown */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-aim-500" /> Payment Methods
          </h2>

          <div className="space-y-3">
            {Object.entries(modeBreakdown).map(([mode, data]) => {
              const totalAmount = data.total;
              const percent =
                totalLifetimeRevenue > 0
                  ? Math.round((totalAmount / totalLifetimeRevenue) * 100)
                  : 0;

              return (
                <div key={mode} className="p-3 rounded-xl bg-dark-900 border border-dark-800 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="uppercase font-bold text-white font-mono">{mode}</span>
                    <span className="text-slate-400 font-semibold">
                      {formatCurrency(totalAmount)} ({percent}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {data.count} {data.count === 1 ? 'transaction' : 'transactions'}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-dark-800 overflow-hidden">
                    <div
                      className="h-full bg-aim-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ATTENDANCE & MEMBER ENROLLMENT METRICS */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-aim-500" /> Attendance Channel Distribution
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">QR Code Scans</div>
              <div className="text-2xl font-black text-sky-400 mt-1">{qrVisits}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Contactless ID scans</div>
            </div>
            <div className="text-xl font-bold text-slate-400 font-mono">{qrPercentage}%</div>
          </div>

          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Manual Front Desk</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{manualVisits}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Assisted check-ins</div>
            </div>
            <div className="text-xl font-bold text-slate-400 font-mono">
              {totalVisits > 0 ? 100 - qrPercentage : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
