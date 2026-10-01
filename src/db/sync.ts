import { db, DEFAULT_GYM_ID } from './dexie';
import { supabase, isSupabaseConfigured } from './supabase';

export type SyncState = 'offline' | 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncTime: string | null;
  pendingCount: number;
  errorMessage?: string;
}

const LAST_SYNC_KEY = 'aim_last_sync_timestamp';

// Event listeners for sync state changes
type SyncListener = (status: SyncStatusInfo) => void;
const listeners: Set<SyncListener> = new Set();

let currentStatus: SyncStatusInfo = {
  state: navigator.onLine ? 'idle' : 'offline',
  lastSyncTime: localStorage.getItem(LAST_SYNC_KEY),
  pendingCount: 0,
};

function updateStatus(updates: Partial<SyncStatusInfo>) {
  currentStatus = { ...currentStatus, ...updates };
  listeners.forEach((listener) => listener(currentStatus));
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  // Initial callback
  db.outbox.count().then((count) => {
    updateStatus({ pendingCount: count });
  });
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus(): SyncStatusInfo {
  return currentStatus;
}

/**
 * Pushes all pending outbox records to Supabase.
 * Never deletes from outbox until the server confirms success.
 */
async function pushOutbox(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    return 0;
  }

  const items = await db.outbox.orderBy('id').toArray();
  let syncedCount = 0;

  for (const item of items) {
    try {
      let error: any = null;

      if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
        const { error: upsertErr } = await supabase
          .from(item.table_name)
          .upsert(item.payload, { onConflict: 'id' });
        error = upsertErr;
      } else if (item.operation === 'DELETE') {
        const { error: delErr } = await supabase
          .from(item.table_name)
          .delete()
          .eq('id', item.row_id);
        error = delErr;
      }

      if (error) {
        console.warn(`[Sync] Failed to push outbox item ${item.id}`, error);
        await db.outbox.update(item.id!, { attempts: item.attempts + 1 });
      } else {
        // Successfully synced to remote: delete from outbox
        await db.outbox.delete(item.id!);
        syncedCount++;
      }
    } catch (e) {
      console.warn(`[Sync] Error syncing item ${item.id}`, e);
      await db.outbox.update(item.id!, { attempts: item.attempts + 1 });
    }
  }

  return syncedCount;
}

/**
 * Pulls changes from Supabase updated since last sync.
 * Conflict resolution rule: Last write wins by updated_at.
 */
async function pullRemoteChanges(lastSync: string | null): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const tables = ['gyms', 'plans', 'members', 'payments', 'attendance', 'reminders_log'] as const;

  for (const table of tables) {
    let query = supabase.from(table).select('*').eq('gym_id', DEFAULT_GYM_ID);
    if (lastSync) {
      query = query.gt('updated_at', lastSync);
    }

    const { data, error } = await query;
    if (error) {
      console.warn(`[Sync] Failed to pull ${table}`, error);
      continue;
    }

    if (data && data.length > 0) {
      for (const remoteRow of data) {
        const localTable = (db as any)[table];
        if (!localTable) continue;

        const localRow = await localTable.get(remoteRow.id);
        if (!localRow) {
          // New row on remote: insert locally
          await localTable.put(remoteRow);
        } else {
          // Last write wins by updated_at
          const remoteTime = new Date(remoteRow.updated_at).getTime();
          const localTime = new Date(localRow.updated_at).getTime();
          if (remoteTime >= localTime) {
            await localTable.put(remoteRow);
          }
        }
      }
    }
  }
}

/**
 * Executes a full two-way synchronization run.
 */
export async function runSync(force: boolean = false): Promise<void> {
  if (!navigator.onLine) {
    updateStatus({ state: 'offline' });
    return;
  }

  const pending = await db.outbox.count();
  updateStatus({ pendingCount: pending });

  // If Supabase is not yet configured, stay in offline-ready state
  if (!isSupabaseConfigured || !supabase) {
    updateStatus({
      state: 'synced',
      pendingCount: pending,
      errorMessage: undefined,
    });
    return;
  }

  if (currentStatus.state === 'syncing' && !force) {
    return;
  }

  try {
    updateStatus({ state: 'syncing', errorMessage: undefined });

    // Step 1: Push outbox
    await pushOutbox();

    // Step 2: Pull remote changes
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    await pullRemoteChanges(lastSync);

    // Step 3: Record new sync timestamp
    const nowIso = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, nowIso);

    const remainingPending = await db.outbox.count();
    updateStatus({
      state: 'synced',
      lastSyncTime: nowIso,
      pendingCount: remainingPending,
      errorMessage: undefined,
    });
  } catch (err: any) {
    console.error('[Sync] Full sync run failed', err);
    const count = await db.outbox.count();
    updateStatus({
      state: 'error',
      pendingCount: count,
      errorMessage: err?.message || 'Sync failed',
    });
  }
}

// Auto sync event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateStatus({ state: 'idle' });
    runSync();
  });

  window.addEventListener('offline', () => {
    updateStatus({ state: 'offline' });
  });

  // Background sync every 5 minutes while online
  setInterval(() => {
    if (navigator.onLine && isSupabaseConfigured) {
      runSync();
    }
  }, 5 * 60 * 1000);
}
