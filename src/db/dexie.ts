import Dexie, { type Table } from 'dexie';
import type {
  Gym,
  Profile,
  Plan,
  Member,
  Payment,
  Attendance,
  ReminderLog,
  OutboxItem,
} from '@/types';

export const DEFAULT_GYM_ID = '00000000-0000-0000-0000-000000000001';

// Device ID persistence for multi-device sync traceability
export const getDeviceId = (): string => {
  let devId = localStorage.getItem('aim_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    localStorage.setItem('aim_device_id', devId);
  }
  return devId;
};

export class AimFitnessDatabase extends Dexie {
  gyms!: Table<Gym, string>;
  profiles!: Table<Profile, string>;
  plans!: Table<Plan, string>;
  members!: Table<Member, string>;
  payments!: Table<Payment, string>;
  attendance!: Table<Attendance, string>;
  reminders_log!: Table<ReminderLog, string>;
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super('AimFitnessDB');
    this.version(1).stores({
      gyms: 'id, updated_at',
      profiles: 'id, gym_id, user_id, role',
      plans: 'id, gym_id, is_active, updated_at',
      members: 'id, gym_id, member_code, phone, current_due_date, status, updated_at',
      payments: 'id, gym_id, member_id, paid_on, updated_at',
      attendance: 'id, gym_id, member_id, checked_in_at',
      reminders_log: 'id, gym_id, member_id, sent_at',
      outbox: '++id, table_name, row_id, created_at',
    });
  }
}

export const db = new AimFitnessDatabase();

// Seed initial AIM Fitness defaults into IndexedDB if empty
export async function seedInitialDataIfNeeded() {
  // One-time automatic purge of previous test member/payment data for a clean slate
  const RESET_VERSION = 'aim_fresh_slate_v3';
  if (typeof window !== 'undefined' && !localStorage.getItem(RESET_VERSION)) {
    await resetDatabaseToFresh();
    localStorage.setItem(RESET_VERSION, 'true');
    console.log('[AIM Fitness] Previous test data auto-purged for fresh testing slate.');
  }

  const existingGym = await db.gyms.get(DEFAULT_GYM_ID);
  if (existingGym) {
    await db.gyms.update(DEFAULT_GYM_ID, {
      tagline: 'Gymming Beyond Tradition',
      logo_url: '/logo.png',
    });
  }

  const gymCount = await db.gyms.count();
  if (gymCount === 0) {
    const now = new Date().toISOString();
    const defaultGym: Gym = {
      id: DEFAULT_GYM_ID,
      name: 'AIM Fitness',
      short_name: 'AIM Fitness',
      tagline: 'Gymming Beyond Tradition',
      logo_url: '/logo.png',
      phone: 'TODO_PHONE_NUMBER',
      whatsapp_number: 'TODO_WHATSAPP_NUMBER',
      address: 'TODO_FULL_ADDRESS, Ratnagiri, Maharashtra 415612',
      map_link: 'TODO_GOOGLE_MAPS_LINK',
      instagram_url: 'https://www.instagram.com/aimfitness_ratnagiri/',
      timings: {
        morning: '06:00 AM - 11:00 AM',
        evening: '05:00 PM - 10:00 PM',
        sunday: '07:00 AM - 12:00 PM',
      },
      primary_color: '#0f1117',
      accent_color: '#f97316',
      currency: 'INR',
      reminder_days_before: 5,
      qr_secret: 'aim_secret_ratnagiri_key_2026',
      template_fee_due:
        'Hi {name}, this is AIM Fitness, Ratnagiri. Your gym fees of ₹{amount} are due on {due_date} ({days_left} days left). Please pay at the front desk. Thank you!',
      template_fee_overdue:
        'Hi {name}, your AIM Fitness membership fees of ₹{amount} were due on {due_date}. Please pay at the earliest to continue your workouts. Thank you!',
      template_welcome: 'Welcome to AIM Fitness, {name}! Your member ID is {member_code}. Aim high!',
      language: 'en',
      device_id: getDeviceId(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    const defaultPlans: Plan[] = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        gym_id: DEFAULT_GYM_ID,
        name: '1 Month General Fitness',
        duration_months: 1,
        price: 1000,
        is_active: true,
        device_id: getDeviceId(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        gym_id: DEFAULT_GYM_ID,
        name: '3 Months Muscle Builder',
        duration_months: 3,
        price: 2700,
        is_active: true,
        device_id: getDeviceId(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        gym_id: DEFAULT_GYM_ID,
        name: '6 Months Transformation',
        duration_months: 6,
        price: 5000,
        is_active: true,
        device_id: getDeviceId(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        gym_id: DEFAULT_GYM_ID,
        name: '12 Months Annual VIP',
        duration_months: 12,
        price: 9000,
        is_active: true,
        device_id: getDeviceId(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ];

    const defaultProfiles: Profile[] = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        gym_id: DEFAULT_GYM_ID,
        role: 'owner',
        display_name: 'Gym Owner',
        email: 'owner@aimfitness.local',
        device_id: getDeviceId(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        gym_id: DEFAULT_GYM_ID,
        role: 'staff',
        display_name: 'Front Desk Staff',
        email: 'staff@aimfitness.local',
        device_id: getDeviceId(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ];

    await db.gyms.add(defaultGym);
    await db.plans.bulkAdd(defaultPlans);
    await db.profiles.bulkAdd(defaultProfiles);
  }
}

/**
 * Completely resets member data, payments, attendance, reminder logs, and outbox.
 * Retains default gym branding settings and plans for fresh testing.
 */
export async function resetDatabaseToFresh(): Promise<void> {
  await Promise.all([
    db.members.clear(),
    db.payments.clear(),
    db.attendance.clear(),
    db.reminders_log.clear(),
    db.outbox.clear(),
  ]);
  localStorage.removeItem('aim_portal_member_id');
  localStorage.removeItem('aim_last_sync_timestamp');
}
