import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, resetDatabaseToFresh } from '@/db/dexie';
import { formatDate } from '@/lib/dateUtils';
import { useAuth } from '@/app/AuthContext';

export const BackupScreen: React.FC = () => {
  const { userRole } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (userRole !== 'owner') {
    return (
      <div className="bg-dark-850 border border-rose-500/30 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Owner Access Required</h2>
        <p className="text-xs text-slate-300">
          Database backup and data restoration operations are restricted to the gym owner.
        </p>
      </div>
    );
  }

  // 1. Export All Data to JSON
  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      setStatusMessage('');
      setErrorMessage('');

      const [gyms, plans, members, payments, attendance, reminders_log] = await Promise.all([
        db.gyms.toArray(),
        db.plans.toArray(),
        db.members.toArray(),
        db.payments.toArray(),
        db.attendance.toArray(),
        db.reminders_log.toArray(),
      ]);

      const backupData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        gym: 'AIM Fitness Ratnagiri',
        tables: {
          gyms,
          plans,
          members,
          payments,
          attendance,
          reminders_log,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `AIM_Fitness_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMessage('JSON backup successfully created and downloaded.');
    } catch (err: any) {
      console.error('Export JSON failed', err);
      setErrorMessage('Failed to generate JSON backup: ' + err?.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export All Data to Multi-Sheet Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setStatusMessage('');
      setErrorMessage('');

      const [members, payments, attendance, plans] = await Promise.all([
        db.members.toArray(),
        db.payments.toArray(),
        db.attendance.toArray(),
        db.plans.toArray(),
      ]);

      const workbook = XLSX.utils.book_new();

      // Sheet 1: Members
      const membersData = members.map((m) => ({
        'Member Code': m.member_code,
        'Full Name': m.full_name,
        'Mobile Phone': m.phone,
        Gender: m.gender || '',
        'Join Date': m.join_date,
        'Due Date': m.current_due_date || '',
        Status: m.status,
        Address: m.address || '',
        Notes: m.notes || '',
      }));
      const wsMembers = XLSX.utils.json_to_sheet(membersData);
      XLSX.utils.book_append_sheet(workbook, wsMembers, 'Members');

      // Sheet 2: Payments
      const paymentsData = payments.map((p) => {
        const mem = members.find((m) => m.id === p.member_id);
        return {
          'Payment Date': p.paid_on,
          'Member Code': mem?.member_code || '',
          'Member Name': mem?.full_name || '',
          'Amount (INR)': p.amount,
          Mode: p.mode,
          'Period Start': p.period_start,
          'Period End': p.period_end,
          'Received By': p.received_by || '',
          Note: p.note || '',
        };
      });
      const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
      XLSX.utils.book_append_sheet(workbook, wsPayments, 'Payments');

      // Sheet 3: Attendance
      const attendanceData = attendance.map((a) => {
        const mem = members.find((m) => m.id === a.member_id);
        return {
          'Check-In Date/Time': formatDate(a.checked_in_at, 'yyyy-MM-dd hh:mm a'),
          'Member Code': mem?.member_code || '',
          'Member Name': mem?.full_name || '',
          Method: a.method,
          'Recorded By': a.recorded_by || '',
        };
      });
      const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(workbook, wsAttendance, 'Attendance');

      // Sheet 4: Plans
      const plansData = plans.map((pl) => ({
        'Plan Name': pl.name,
        'Duration (Months)': pl.duration_months,
        'Price (INR)': pl.price,
        'Is Active': pl.is_active ? 'Yes' : 'No',
      }));
      const wsPlans = XLSX.utils.json_to_sheet(plansData);
      XLSX.utils.book_append_sheet(workbook, wsPlans, 'Plans');

      // Write and download
      XLSX.writeFile(
        workbook,
        `AIM_Fitness_Export_${new Date().toISOString().split('T')[0]}.xlsx`
      );
      setStatusMessage('Excel spreadsheet successfully generated and downloaded.');
    } catch (err: any) {
      console.error('Export Excel failed', err);
      setErrorMessage('Failed to generate Excel export: ' + err?.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Restore from JSON
  const handleRestoreJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Restoring will merge imported records into your local database. Proceed?')) {
      return;
    }

    try {
      setIsRestoring(true);
      setStatusMessage('');
      setErrorMessage('');

      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.tables || !data.tables.members) {
        throw new Error('Invalid AIM Fitness backup format.');
      }

      const { tables } = data;

      // Bulk merge into IndexedDB
      if (tables.gyms?.length) await db.gyms.bulkPut(tables.gyms);
      if (tables.plans?.length) await db.plans.bulkPut(tables.plans);
      if (tables.members?.length) await db.members.bulkPut(tables.members);
      if (tables.payments?.length) await db.payments.bulkPut(tables.payments);
      if (tables.attendance?.length) await db.attendance.bulkPut(tables.attendance);
      if (tables.reminders_log?.length) await db.reminders_log.bulkPut(tables.reminders_log);

      setStatusMessage(
        `Successfully restored database! Imported ${tables.members.length} members and ${tables.payments?.length || 0} payments.`
      );
    } catch (err: any) {
      console.error('Restore failed', err);
      setErrorMessage('Failed to restore data: ' + err?.message);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetData = async () => {
    try {
      setIsResetting(true);
      setStatusMessage('');
      setErrorMessage('');
      await resetDatabaseToFresh();
      setConfirmResetOpen(false);
      setStatusMessage(
        'All test members, payments, attendance, and reminders have been successfully cleared! The system is now completely fresh.'
      );
    } catch (err: any) {
      console.error('Failed to reset data', err);
      setErrorMessage('Failed to clear data: ' + err?.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-aim-500" /> Database Backup & Restore
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          One-tap local data backup, spreadsheet export, and disaster recovery restore
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CARD 1: EXPORT DATA */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-aim-500/10 text-aim-400 border border-aim-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export & Download</h2>
              <p className="text-xs text-slate-400">Save full records to your local device</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-dark-900 hover:bg-dark-800 text-slate-200 border border-dark-700 hover:border-emerald-500/40 flex items-center justify-between transition-all group"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Export as Excel Workbook (.xlsx)</span>
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Multi-Sheet</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={isExporting}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-dark-900 hover:bg-dark-800 text-slate-200 border border-dark-700 hover:border-aim-500/40 flex items-center justify-between transition-all group"
            >
              <span className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-aim-400 group-hover:scale-110 transition-transform" />
                <span>Export Full JSON Backup (.json)</span>
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Raw DB</span>
            </button>
          </div>
        </div>

        {/* CARD 2: RESTORE FROM BACKUP */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Restore Database</h2>
              <p className="text-xs text-slate-400">Import and restore from a JSON file</p>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Select an existing AIM Fitness JSON backup file to restore or migrate data onto this device.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleRestoreJson}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isRestoring ? 'Restoring...' : 'Select JSON File to Restore'}</span>
          </button>
        </div>
      </div>

      {/* CARD 3: DANGER ZONE - WIPE ALL DATA FOR FRESH SLATE */}
      <div className="bg-dark-850 border border-rose-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Clean Slate / Reset Test Data</h2>
            <p className="text-xs text-slate-400">Permanently clear member, payment, and attendance records</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Need to test with a fresh database? This will purge all registered members, payments, attendance records,
          and outbox queues on this device. Gym settings, plans, and owner credentials are safe.
        </p>

        <button
          onClick={() => setConfirmResetOpen(true)}
          disabled={isResetting}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          <span>Wipe All Data for Fresh Testing</span>
        </button>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-rose-500/40 rounded-2xl p-6 max-w-md w-full space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Complete Reset</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Are you sure you want to clear all test records? This will delete all members, attendance logs, and payments. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-dark-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetData}
                disabled={isResetting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all"
              >
                {isResetting ? (
                  'Clearing...'
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Wipe All Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
