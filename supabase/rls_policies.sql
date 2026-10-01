-- AIM Fitness Row Level Security (RLS) Policies
-- Enforces multi-tenancy and role-based permissions

-- Enable RLS on all tables
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_log ENABLE ROW LEVEL SECURITY;

-- Helper function: get the authenticated user's profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (gym_id UUID, role TEXT) AS $$
    SELECT gym_id, role FROM profiles WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. GYMS POLICIES
-- Read: Users can view their own gym
CREATE POLICY "Users can view their gym"
ON gyms FOR SELECT
TO authenticated
USING (id = (SELECT gym_id FROM get_user_profile()));

-- Public read for gym info on public website
CREATE POLICY "Public can view active gym details"
ON gyms FOR SELECT
TO anon
USING (deleted_at IS NULL);

-- Update: Only owner can update gym settings
CREATE POLICY "Only owner can update gym settings"
ON gyms FOR UPDATE
TO authenticated
USING (id = (SELECT gym_id FROM get_user_profile()) AND (SELECT role FROM get_user_profile()) = 'owner');

-- 2. PROFILES POLICIES
CREATE POLICY "Users can view profiles in their gym"
ON profiles FOR SELECT
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()));

CREATE POLICY "Owner can manage profiles in their gym"
ON profiles FOR ALL
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND (SELECT role FROM get_user_profile()) = 'owner');

-- 3. PLANS POLICIES
CREATE POLICY "Users can view plans in their gym"
ON plans FOR SELECT
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND deleted_at IS NULL);

CREATE POLICY "Public can view active plans"
ON plans FOR SELECT
TO anon
USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Only owner can manage plans"
ON plans FOR ALL
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND (SELECT role FROM get_user_profile()) = 'owner');

-- 4. MEMBERS POLICIES
CREATE POLICY "Staff and Owner can view members in their gym"
ON members FOR SELECT
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND deleted_at IS NULL);

CREATE POLICY "Staff and Owner can insert and update members in their gym"
ON members FOR INSERT
TO authenticated
WITH CHECK (gym_id = (SELECT gym_id FROM get_user_profile()));

CREATE POLICY "Staff and Owner can update members in their gym"
ON members FOR UPDATE
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()));

CREATE POLICY "Only owner can delete members"
ON members FOR DELETE
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND (SELECT role FROM get_user_profile()) = 'owner');

-- 5. PAYMENTS POLICIES
CREATE POLICY "Staff and Owner can view payments in their gym"
ON payments FOR SELECT
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND deleted_at IS NULL);

CREATE POLICY "Staff and Owner can record payments"
ON payments FOR INSERT
TO authenticated
WITH CHECK (gym_id = (SELECT gym_id FROM get_user_profile()));

CREATE POLICY "Only owner can update payments"
ON payments FOR UPDATE
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND (SELECT role FROM get_user_profile()) = 'owner');

CREATE POLICY "Only owner can delete payments"
ON payments FOR DELETE
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND (SELECT role FROM get_user_profile()) = 'owner');

-- 6. ATTENDANCE POLICIES
CREATE POLICY "Staff and Owner can view attendance in their gym"
ON attendance FOR SELECT
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND deleted_at IS NULL);

CREATE POLICY "Staff and Owner can record attendance"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (gym_id = (SELECT gym_id FROM get_user_profile()));

-- 7. REMINDERS LOG POLICIES
CREATE POLICY "Staff and Owner can view reminder logs"
ON reminders_log FOR SELECT
TO authenticated
USING (gym_id = (SELECT gym_id FROM get_user_profile()) AND deleted_at IS NULL);

CREATE POLICY "Staff and Owner can log reminders"
ON reminders_log FOR INSERT
TO authenticated
WITH CHECK (gym_id = (SELECT gym_id FROM get_user_profile()));
