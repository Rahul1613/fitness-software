import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cloud,
} from 'lucide-react';
import {
  subscribeToSyncStatus,
  runSync,
  getSyncStatus,
  type SyncStatusInfo,
} from '@/db/sync';
import { isSupabaseConfigured } from '@/db/supabase';
import { formatDate } from '@/lib/dateUtils';

export const SyncStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusInfo>(getSyncStatus());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleSyncNow = async () => {
    try {
      setIsManualSyncing(true);
      await runSync(true);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getBadgeContent = () => {
    if (status.state === 'offline') {
      return {
        icon: <WifiOff className="w-3.5 h-3.5" />,
        text: 'Offline',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }
    if (status.state === 'syncing' || isManualSyncing) {
      return {
        icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
        text: 'Syncing...',
        badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      };
    }
    if (status.state === 'error') {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        text: 'Sync Error',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    }
    // Synced / Idle
    return {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      text: status.pendingCount > 0 ? `${status.pendingCount} Pending` : 'Synced',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
  };

  const { icon, text, badgeClass } = getBadgeContent();

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${badgeClass}`}
        title="Sync Status • Click for details and manual sync"
      >
        {icon}
        <span className="hidden sm:inline">{text}</span>
      </button>

      {/* Sync Details Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-dark-850 border border-dark-700 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between border-b border-dark-750 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-aim-400" /> Supabase Cloud Sync
            </h4>
            <span
              className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${badgeClass}`}
            >
              {status.state}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Database Backend:</span>
              <span className="font-semibold text-white">
                {isSupabaseConfigured ? 'Supabase Connected' : 'IndexedDB (Local)'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Pending Outbox Items:</span>
              <span className="font-mono font-bold text-aim-400">{status.pendingCount}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Last Synced:</span>
              <span className="text-slate-200">
                {status.lastSyncTime
                  ? formatDate(status.lastSyncTime, 'dd MMM, hh:mm a')
                  : 'Never'}
              </span>
            </div>

            {status.errorMessage && (
              <p className="text-[11px] text-rose-400 mt-1">{status.errorMessage}</p>
            )}
          </div>

          <div className="pt-2 border-t border-dark-750">
            <button
              onClick={handleSyncNow}
              disabled={isManualSyncing || status.state === 'syncing'}
              className="w-full py-2 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-md shadow-aim-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'Syncing Now...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
