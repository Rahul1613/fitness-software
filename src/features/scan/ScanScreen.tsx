import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  getGymSettings,
  getMemberById,
  getAllMembers,
  recordAttendance,
  getRecentCheckInForMember,
} from '@/db/repository';
import { verifyQrToken } from '@/lib/qrToken';
import { computeFeeStatus } from '@/lib/feeStatus';
import { formatDate } from '@/lib/dateUtils';
import type { Member, Gym, Attendance } from '@/types';
import { useAuth } from '@/app/AuthContext';

type ScanStatus =
  | 'idle'
  | 'scanning'
  | 'success_green'
  | 'warning_amber'
  | 'danger_red'
  | 'already_checked_in'
  | 'invalid_qr'
  | 'camera_error';

export const ScanScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [gym, setGym] = useState<Gym | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scannedMember, setScannedMember] = useState<Member | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual fallback search
  const [manualQuery, setManualQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  // Play audio tone on scan
  const playBeep = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  useEffect(() => {
    async function init() {
      const [g, members] = await Promise.all([getGymSettings(), getAllMembers()]);
      setGym(g || null);
      setAllMembers(members);
    }
    init();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    if (!gym) return;
    setScanStatus('scanning');
    setErrorMessage('');
    isProcessingRef.current = false;

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode('qr-reader-view');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          await handleQrDecoded(decodedText);
        },
        () => {
          // Frame parse error ignored
        }
      );
    } catch (err: any) {
      console.error('Camera initialization error', err);
      setScanStatus('camera_error');
      setErrorMessage(
        err?.message || 'Unable to access camera. Please allow camera permissions or use manual check-in.'
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner', e);
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (activeTab === 'camera' && gym && scanStatus === 'idle') {
      startScanner();
    } else if (activeTab === 'manual') {
      stopScanner();
    }
  }, [activeTab, gym, scanStatus]);

  const handleQrDecoded = async (token: string) => {
    if (!gym) return;
    await stopScanner();

    // Verify cryptographic signature and gym match
    const verification = await verifyQrToken(token, gym.id, gym.qr_secret);

    if (!verification.isValid || !verification.memberId) {
      playBeep('error');
      setScanStatus('invalid_qr');
      if (verification.error === 'GYM_MISMATCH') {
        setErrorMessage('QR Code belongs to a different gym!');
      } else if (verification.error === 'FORGED_SIGNATURE') {
        setErrorMessage('Invalid or forged QR token signature!');
      } else {
        setErrorMessage('Unrecognized QR format.');
      }
      return;
    }

    // Lookup member in Dexie
    const member = await getMemberById(verification.memberId);
    if (!member) {
      playBeep('error');
      setScanStatus('invalid_qr');
      setErrorMessage('Member not found in local database.');
      return;
    }

    await processMemberCheckIn(member, 'qr');
  };

  const processMemberCheckIn = async (member: Member, method: 'qr' | 'manual') => {
    if (!gym) return;
    setScannedMember(member);

    // Check duplicate scan within 60 minutes
    const recent = await getRecentCheckInForMember(member.id, 60);
    if (recent) {
      playBeep('warning');
      setRecentAttendance(recent);
      setScanStatus('already_checked_in');
      return;
    }

    // Always record attendance
    await recordAttendance({
      member_id: member.id,
      checked_in_at: new Date().toISOString(),
      method,
      recorded_by: profile?.display_name || 'Front Desk',
    });

    // Evaluate fee status
    const feeInfo = computeFeeStatus(member, gym.reminder_days_before);

    if (feeInfo.status === 'paid') {
      playBeep('success');
      setScanStatus('success_green');
    } else if (feeInfo.status === 'due_soon') {
      playBeep('warning');
      setScanStatus('warning_amber');
    } else {
      // Overdue or Inactive
      playBeep('error');
      setScanStatus('danger_red');
    }
  };

  const handleResetScan = () => {
    setScannedMember(null);
    setRecentAttendance(null);
    setScanStatus('idle');
    setErrorMessage('');
  };

  // Auto-reset scanner after 3.5s so next member in line can scan immediately
  useEffect(() => {
    if (
      scanStatus === 'success_green' ||
      scanStatus === 'warning_amber' ||
      scanStatus === 'danger_red' ||
      scanStatus === 'already_checked_in'
    ) {
      const timer = setTimeout(() => {
        handleResetScan();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [scanStatus]);

  // Manual check-in filter
  const filteredManualMembers = allMembers.filter((m) => {
    if (!manualQuery.trim()) return false;
    const q = manualQuery.toLowerCase().trim();
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.member_code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Admin Portal</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-dark-800 text-slate-300 hover:text-white border border-dark-700"
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Tab Switcher: Camera Scanner vs Manual Search */}
          <div className="flex bg-dark-800 rounded-xl p-1 border border-dark-700">
            <button
              onClick={() => {
                setActiveTab('camera');
                handleResetScan();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'camera'
                  ? 'bg-aim-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scan</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manual');
                handleResetScan();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-aim-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Manual Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN RESULT STATES */}

      {/* 1. GREEN RESULT: PAID / ACTIVE */}
      {scanStatus === 'success_green' && scannedMember && (
        <div className="bg-gradient-to-b from-emerald-950/80 to-dark-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Check-In Approved • Paid
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
              Welcome, {scannedMember.full_name}!
            </h2>
            <p className="text-sm text-slate-300 mt-1 font-mono">
              Member ID: <strong className="text-aim-400">{scannedMember.member_code}</strong>
            </p>
          </div>

          {scannedMember.photo_url && (
            <img
              src={scannedMember.photo_url}
              alt={scannedMember.full_name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/50 mx-auto shadow-md"
            />
          )}

          <div className="p-3.5 rounded-2xl bg-dark-950/70 border border-emerald-500/30 max-w-sm mx-auto text-xs space-y-1">
            <div className="text-slate-400">Membership Valid Until:</div>
            <div className="text-base font-bold text-emerald-400">
              {formatDate(scannedMember.current_due_date)}
            </div>
            <div className="text-[11px] text-slate-400">Recorded via QR Code Check-In</div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 pt-2">
            <span className="text-[11px] text-emerald-400 font-medium animate-pulse">
              Attendance Logged • Resetting in 3s for next member...
            </span>
            <button
              onClick={handleResetScan}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all"
            >
              Scan Next Member
            </button>
          </div>
        </div>
      )}

      {/* 2. AMBER RESULT: DUE SOON */}
      {scanStatus === 'warning_amber' && scannedMember && (
        <div className="bg-gradient-to-b from-amber-950/80 to-dark-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
            <Clock className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Entry Allowed • Fee Due Soon
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
              Welcome, {scannedMember.full_name}
            </h2>
            <p className="text-sm text-slate-300 mt-1 font-mono">
              Member ID: <strong className="text-aim-400">{scannedMember.member_code}</strong>
            </p>
          </div>

          {scannedMember.photo_url && (
            <img
              src={scannedMember.photo_url}
              alt={scannedMember.full_name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-500/50 mx-auto shadow-md"
            />
          )}

          <div className="p-4 rounded-2xl bg-dark-950/70 border border-amber-500/30 max-w-sm mx-auto text-xs space-y-1">
            <div className="text-amber-400 font-bold">Gentle Fee Reminder:</div>
            <div className="text-sm text-white font-semibold">
              Gym fee is due on {formatDate(scannedMember.current_due_date)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Please remind member to renew at front desk.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 pt-2">
            <span className="text-[11px] text-amber-400 font-medium animate-pulse">
              Attendance Logged • Resetting in 3s for next member...
            </span>
            <button
              onClick={handleResetScan}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-white border border-dark-700"
            >
              Scan Next Member
            </button>
          </div>
        </div>
      )}

      {/* 3. RED RESULT: OVERDUE / UNPAID */}
      {scanStatus === 'danger_red' && scannedMember && (
        <div className="bg-gradient-to-b from-rose-950/90 to-dark-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 border-2 border-rose-500/40 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30 animate-pulse">
            <AlertTriangle className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Attendance Logged • Fee Renewal Pending
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
              {scannedMember.full_name}
            </h2>
            <p className="text-sm text-slate-300 mt-1 font-mono">
              Member ID: <strong className="text-rose-400">{scannedMember.member_code}</strong>
            </p>
          </div>

          {scannedMember.photo_url && (
            <img
              src={scannedMember.photo_url}
              alt={scannedMember.full_name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-rose-500/50 mx-auto shadow-md"
            />
          )}

          <div className="p-4 rounded-2xl bg-dark-950/80 border border-rose-500/40 max-w-sm mx-auto text-xs space-y-1">
            <div className="text-emerald-400 font-bold text-sm">
              Attendance Logged Successfully ✓
            </div>
            <div className="text-rose-400 font-semibold text-xs mt-1">
              Membership expired on {formatDate(scannedMember.current_due_date)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Renewal approval is handled strictly by the gym owner. Please settle fee at front desk.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 pt-2">
            <span className="text-[11px] text-rose-400 font-medium animate-pulse">
              Resetting in 3s for next member...
            </span>
            <button
              onClick={handleResetScan}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-white border border-dark-700"
            >
              Scan Next Member
            </button>
          </div>
        </div>
      )}

      {/* 4. DUPLICATE CHECK-IN PREVENTED */}
      {scanStatus === 'already_checked_in' && scannedMember && (
        <div className="bg-dark-850 border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Duplicate Check-In Prevented
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-3">
              {scannedMember.full_name} is Already Checked In
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Checked in at{' '}
              <strong className="text-amber-400">
                {recentAttendance ? formatDate(recentAttendance.checked_in_at, 'hh:mm a') : 'Recently'}
              </strong>{' '}
              (within the 60-minute window).
            </p>
          </div>

          <button
            onClick={handleResetScan}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-white border border-dark-700"
          >
            Scan Next Member
          </button>
        </div>
      )}

      {/* 5. INVALID / FORGED QR */}
      {scanStatus === 'invalid_qr' && (
        <div className="bg-dark-850 border border-rose-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              QR Verification Failed
            </span>
            <h2 className="text-xl font-black text-white mt-2">Invalid or Rejected QR</h2>
            <p className="text-xs text-rose-300 mt-1">{errorMessage}</p>
          </div>

          <button
            onClick={handleResetScan}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-aim-500 text-white"
          >
            Try Again
          </button>
        </div>
      )}

      {/* CAMERA SCAN VIEW */}
      {activeTab === 'camera' && (scanStatus === 'idle' || scanStatus === 'scanning') && (
        <div className="space-y-4">
          <div className="bg-dark-850 border border-dark-750 rounded-3xl p-4 sm:p-6 text-center space-y-4 shadow-xl">
            <div className="relative w-full max-w-[340px] sm:max-w-[400px] aspect-square mx-auto rounded-2xl overflow-hidden bg-black border-2 border-dark-700 flex items-center justify-center shadow-inner">
              <div id="qr-reader-view" className="w-full h-full"></div>

              {/* Target Scan Box Guide */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-dashed border-aim-500 rounded-2xl animate-pulse"></div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-slate-300">Point camera at AIM Fitness Member Card</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cryptographic offline signature verification active
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA PERMISSION ERROR */}
      {scanStatus === 'camera_error' && (
        <div className="bg-dark-850 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Camera Access Blocked</h3>
          <p className="text-xs text-slate-400">{errorMessage}</p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={startScanner}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-aim-500 text-white flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-dark-800 text-slate-200 border border-dark-700"
            >
              Switch to Manual Search
            </button>
          </div>
        </div>
      )}

      {/* MANUAL SEARCH FALLBACK TAB */}
      {activeTab === 'manual' && scanStatus === 'idle' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              autoFocus
              placeholder="Search member by name, phone (9822...), or code (AIM-0001)..."
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              className="w-full bg-dark-850 border border-dark-750 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-aim-500 focus:ring-1 focus:ring-aim-500"
            />
          </div>

          <div className="space-y-2.5">
            {filteredManualMembers.length === 0 ? (
              <div className="bg-dark-850 border border-dark-750 rounded-2xl p-8 text-center text-xs text-slate-400">
                {manualQuery
                  ? 'No members matching this query.'
                  : 'Type a member name or phone to quickly mark attendance.'}
              </div>
            ) : (
              filteredManualMembers.map((m) => {
                const fee = computeFeeStatus(m, gym?.reminder_days_before ?? 5);
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-dark-850 border border-dark-750 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {m.photo_url ? (
                        <img
                          src={m.photo_url}
                          alt={m.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-dark-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-dark-750 text-aim-400 flex items-center justify-center font-bold text-sm">
                          {m.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{m.full_name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono text-aim-500 font-semibold">{m.member_code}</span>
                          <span>•</span>
                          <span>+91 {m.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${fee.badgeClass}`}
                      >
                        {fee.status === 'paid' ? 'Paid' : fee.status === 'due_soon' ? 'Due Soon' : 'Overdue'}
                      </span>

                      <button
                        onClick={() => processMemberCheckIn(m, 'manual')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white flex items-center gap-1 shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Check In</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
