export type UserRole = 'owner' | 'staff' | 'member';

export type PaymentMode = 'cash' | 'upi' | 'card' | 'other';

export type MemberStatus = 'active' | 'inactive';

export type FeeStatusType = 'paid' | 'due_soon' | 'overdue' | 'inactive';

export type ReminderType = 'due_soon' | 'overdue' | 'welcome';

export type ReminderChannel = 'whatsapp' | 'sms' | 'call' | 'inapp';

export interface Gym {
  id: string;
  name: string;
  short_name: string;
  tagline: string;
  logo_url: string;
  phone: string;
  whatsapp_number: string;
  address: string;
  map_link: string;
  instagram_url: string;
  timings: {
    morning?: string;
    evening?: string;
    sunday?: string;
    [key: string]: string | undefined;
  };
  primary_color: string;
  accent_color: string;
  currency: string;
  reminder_days_before: number;
  qr_secret: string;
  template_fee_due: string;
  template_fee_overdue: string;
  template_welcome: string;
  language: 'en' | 'mr' | 'hi';
  device_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Profile {
  id: string;
  user_id?: string;
  gym_id: string;
  role: UserRole;
  display_name: string;
  email?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  duration_months: number;
  price: number;
  is_active: boolean;
  device_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Member {
  id: string;
  gym_id: string;
  member_code: string; // e.g. AIM-0001
  full_name: string;
  phone: string;
  alt_phone?: string;
  gender?: 'male' | 'female' | 'other' | 'unspecified';
  date_of_birth?: string;
  photo_url?: string;
  address?: string;
  emergency_contact?: string;
  join_date: string;
  current_plan_id?: string;
  current_due_date?: string; // YYYY-MM-DD
  status: MemberStatus;
  notes?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id?: string;
  amount: number;
  paid_on: string; // YYYY-MM-DD
  mode: PaymentMode;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  received_by?: string;
  note?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Attendance {
  id: string;
  gym_id: string;
  member_id: string;
  checked_in_at: string; // ISO string
  method: 'qr' | 'manual';
  recorded_by?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ReminderLog {
  id: string;
  gym_id: string;
  member_id: string;
  type: ReminderType;
  channel: ReminderChannel;
  sent_at: string; // ISO string
  sent_by?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface OutboxItem {
  id?: number;
  table_name: string;
  row_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, any>;
  created_at: string;
  attempts: number;
}
