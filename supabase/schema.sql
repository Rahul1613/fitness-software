-- AIM Fitness Database Schema (PostgreSQL / Supabase)
-- Multi-tenant schema with gym_id on all tables and client-generated UUIDs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GYMS TABLE
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL DEFAULT 'AIM Fitness',
    tagline TEXT DEFAULT 'Aim High. Train Hard. Stay Fit.',
    logo_url TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    address TEXT,
    map_link TEXT,
    instagram_url TEXT DEFAULT 'https://www.instagram.com/aimfitness_ratnagiri/',
    timings JSONB DEFAULT '{"weekday": "06:00 AM - 10:00 PM", "sunday": "07:00 AM - 01:00 PM"}'::jsonb,
    primary_color TEXT DEFAULT '#0f1117',
    accent_color TEXT DEFAULT '#f97316',
    currency TEXT DEFAULT 'INR',
    reminder_days_before INTEGER DEFAULT 5,
    qr_secret TEXT NOT NULL DEFAULT 'aim_secret_ratnagiri_key_2026',
    template_fee_due TEXT DEFAULT 'Hi {name}, this is AIM Fitness, Ratnagiri. Your gym fees of ₹{amount} are due on {due_date} ({days_left} days left). Please pay at the front desk. Thank you!',
    template_fee_overdue TEXT DEFAULT 'Hi {name}, your AIM Fitness membership fees of ₹{amount} were due on {due_date}. Please pay at the earliest to continue your workouts. Thank you!',
    template_welcome TEXT DEFAULT 'Welcome to AIM Fitness, {name}! Your member ID is {member_code}. Aim high!',
    language TEXT DEFAULT 'en',
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

-- 2. PROFILES TABLE (Supabase Auth link)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'member')),
    display_name TEXT NOT NULL,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

-- 3. PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_months INTEGER NOT NULL CHECK (duration_months > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

-- 4. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alt_phone TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unspecified')),
    date_of_birth DATE,
    photo_url TEXT,
    address TEXT,
    emergency_contact TEXT,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    current_due_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_member_code_per_gym UNIQUE (gym_id, member_code)
);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
    mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'card', 'other')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    received_by TEXT,
    note TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

-- 6. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    method TEXT NOT NULL CHECK (method IN ('qr', 'manual')),
    recorded_by TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

-- 7. REMINDERS LOG TABLE
CREATE TABLE IF NOT EXISTS reminders_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('due_soon', 'overdue', 'welcome')),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'call', 'inapp')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    sent_by TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_gym ON members(gym_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_due_date ON members(current_due_date);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_gym_paid ON payments(gym_id, paid_on);
CREATE INDEX IF NOT EXISTS idx_attendance_member_time ON attendance(member_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_time ON attendance(gym_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_member ON reminders_log(member_id, sent_at DESC);
