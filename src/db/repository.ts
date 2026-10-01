import { db, getDeviceId, DEFAULT_GYM_ID } from './dexie';
import type { Member, Payment, Plan, Gym, Attendance, ReminderLog, OutboxItem } from '@/types';

// Queue an action to the local outbox
export async function queueOutbox(
  tableName: string,
  rowId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: Record<string, any>
) {
  const item: OutboxItem = {
    table_name: tableName,
    row_id: rowId,
    operation,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  };
  await db.outbox.add(item);
}

// GYM
export async function getGymSettings(gymId: string = DEFAULT_GYM_ID): Promise<Gym | undefined> {
  return await db.gyms.get(gymId);
}

export async function updateGymSettings(gymId: string, updates: Partial<Gym>): Promise<void> {
  const existing = await db.gyms.get(gymId);
  if (!existing) return;
  const updatedGym: Gym = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
    device_id: getDeviceId(),
  };
  await db.gyms.put(updatedGym);
  await queueOutbox('gyms', gymId, 'UPDATE', updatedGym);
}

// PLANS
export async function getAllPlans(gymId: string = DEFAULT_GYM_ID): Promise<Plan[]> {
  return await db.plans
    .where('gym_id')
    .equals(gymId)
    .filter((p) => !p.deleted_at)
    .toArray();
}

export async function savePlan(plan: Omit<Plan, 'id' | 'created_at' | 'updated_at' | 'gym_id'> & { id?: string }): Promise<Plan> {
  const now = new Date().toISOString();
  const id = plan.id || crypto.randomUUID();
  const isNew = !plan.id;

  const fullPlan: Plan = {
    id,
    gym_id: DEFAULT_GYM_ID,
    name: plan.name,
    duration_months: Number(plan.duration_months),
    price: Number(plan.price),
    is_active: plan.is_active ?? true,
    device_id: getDeviceId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.plans.put(fullPlan);
  await queueOutbox('plans', id, isNew ? 'INSERT' : 'UPDATE', fullPlan);
  return fullPlan;
}

// MEMBERS
export async function getAllMembers(gymId: string = DEFAULT_GYM_ID): Promise<Member[]> {
  return await db.members
    .where('gym_id')
    .equals(gymId)
    .filter((m) => !m.deleted_at)
    .reverse()
    .sortBy('created_at');
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  const member = await db.members.get(id);
  if (member && !member.deleted_at) {
    return member;
  }
  return undefined;
}

export async function generateNextMemberCode(gymId: string = DEFAULT_GYM_ID): Promise<string> {
  const members = await db.members.where('gym_id').equals(gymId).toArray();
  let maxNum = 0;
  for (const m of members) {
    const match = m.member_code?.match(/AIM-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `AIM-${String(nextNum).padStart(4, '0')}`;
}

export async function createMember(data: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'gym_id'>): Promise<Member> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newMember: Member = {
    ...data,
    id,
    gym_id: DEFAULT_GYM_ID,
    device_id: getDeviceId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.members.add(newMember);
  await queueOutbox('members', id, 'INSERT', newMember);
  return newMember;
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<void> {
  const existing = await db.members.get(id);
  if (!existing) return;
  const updated: Member = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
    device_id: getDeviceId(),
  };
  await db.members.put(updated);
  await queueOutbox('members', id, 'UPDATE', updated);
}

export async function softDeleteMember(id: string): Promise<void> {
  const existing = await db.members.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  const deleted: Member = {
    ...existing,
    deleted_at: now,
    updated_at: now,
    device_id: getDeviceId(),
  };
  await db.members.put(deleted);
  await queueOutbox('members', id, 'UPDATE', deleted);
}

// PAYMENTS
export async function getPaymentsForMember(memberId: string): Promise<Payment[]> {
  return await db.payments
    .where('member_id')
    .equals(memberId)
    .filter((p) => !p.deleted_at)
    .reverse()
    .sortBy('paid_on');
}

export async function getAllPayments(gymId: string = DEFAULT_GYM_ID): Promise<Payment[]> {
  return await db.payments
    .where('gym_id')
    .equals(gymId)
    .filter((p) => !p.deleted_at)
    .reverse()
    .sortBy('paid_on');
}

export async function recordPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'gym_id'>): Promise<Payment> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newPayment: Payment = {
    ...paymentData,
    id,
    gym_id: DEFAULT_GYM_ID,
    device_id: getDeviceId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.payments.add(newPayment);
  await queueOutbox('payments', id, 'INSERT', newPayment);

  // Advance member's current_due_date to period_end
  await updateMember(paymentData.member_id, {
    current_due_date: paymentData.period_end,
    current_plan_id: paymentData.plan_id,
    status: 'active',
  });

  return newPayment;
}

// ATTENDANCE
export async function getAttendanceForMember(memberId: string): Promise<Attendance[]> {
  return await db.attendance
    .where('member_id')
    .equals(memberId)
    .filter((a) => !a.deleted_at)
    .reverse()
    .sortBy('checked_in_at');
}

export async function getRecentCheckInForMember(
  memberId: string,
  withinMinutes: number = 60
): Promise<Attendance | null> {
  const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  const recent = await db.attendance
    .where('member_id')
    .equals(memberId)
    .filter((a) => !a.deleted_at && a.checked_in_at >= cutoffTime)
    .first();
  return recent || null;
}

export async function getTodayAttendance(gymId: string = DEFAULT_GYM_ID): Promise<Attendance[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  return await db.attendance
    .where('gym_id')
    .equals(gymId)
    .filter((a) => !a.deleted_at && a.checked_in_at.startsWith(todayStr))
    .reverse()
    .sortBy('checked_in_at');
}

export async function getAllAttendance(gymId: string = DEFAULT_GYM_ID): Promise<Attendance[]> {
  return await db.attendance
    .where('gym_id')
    .equals(gymId)
    .filter((a) => !a.deleted_at)
    .reverse()
    .sortBy('checked_in_at');
}

export async function recordAttendance(data: Omit<Attendance, 'id' | 'created_at' | 'updated_at' | 'gym_id'>): Promise<Attendance> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record: Attendance = {
    ...data,
    id,
    gym_id: DEFAULT_GYM_ID,
    device_id: getDeviceId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.attendance.add(record);
  await queueOutbox('attendance', id, 'INSERT', record);
  return record;
}

// REMINDERS LOG
export async function getRemindersForMember(memberId: string): Promise<ReminderLog[]> {
  return await db.reminders_log
    .where('member_id')
    .equals(memberId)
    .filter((r) => !r.deleted_at)
    .reverse()
    .sortBy('sent_at');
}

export async function logReminder(data: Omit<ReminderLog, 'id' | 'created_at' | 'updated_at' | 'gym_id'>): Promise<ReminderLog> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record: ReminderLog = {
    ...data,
    id,
    gym_id: DEFAULT_GYM_ID,
    device_id: getDeviceId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.reminders_log.add(record);
  await queueOutbox('reminders_log', id, 'INSERT', record);
  return record;
}

export async function hasBeenRemindedToday(memberId: string): Promise<boolean> {
  const todayStr = new Date().toISOString().split('T')[0];
  const logs = await db.reminders_log
    .where('member_id')
    .equals(memberId)
    .toArray();
  return logs.some((l) => l.sent_at.startsWith(todayStr));
}
