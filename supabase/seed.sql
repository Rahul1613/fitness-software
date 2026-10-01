-- Seed Data for AIM Fitness (Ratnagiri)
-- Default Fixed Gym UUID: '00000000-0000-0000-0000-000000000001'

INSERT INTO gyms (
    id,
    name,
    short_name,
    tagline,
    logo_url,
    phone,
    whatsapp_number,
    address,
    map_link,
    instagram_url,
    timings,
    primary_color,
    accent_color,
    currency,
    reminder_days_before,
    qr_secret,
    template_fee_due,
    template_fee_overdue,
    template_welcome,
    language
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'AIM Fitness',
    'AIM Fitness',
    'Aim High. Train Hard. Stay Fit.',
    '/logo.png',
    'TODO_PHONE_NUMBER', -- TODO: Add official gym phone number
    'TODO_WHATSAPP_NUMBER', -- TODO: Add official gym WhatsApp number
    'TODO_FULL_ADDRESS, Ratnagiri, Maharashtra 415612', -- TODO: Add physical gym address
    'TODO_GOOGLE_MAPS_LINK', -- TODO: Add Google Maps embed link
    'https://www.instagram.com/aimfitness_ratnagiri/',
    '{"morning": "06:00 AM - 11:00 AM", "evening": "05:00 PM - 10:00 PM", "sunday": "07:00 AM - 12:00 PM"}'::jsonb,
    '#0f1117',
    '#f97316',
    'INR',
    5,
    'aim_secret_ratnagiri_key_2026',
    'Hi {name}, this is AIM Fitness, Ratnagiri. Your gym fees of ₹{amount} are due on {due_date} ({days_left} days left). Please pay at the front desk. Thank you!',
    'Hi {name}, your AIM Fitness membership fees of ₹{amount} were due on {due_date}. Please pay at the earliest to continue your workouts. Thank you!',
    'Welcome to AIM Fitness, {name}! Your member ID is {member_code}. Aim high!',
    'en'
) ON CONFLICT (id) DO NOTHING;

-- Default Plans (with marked TODO prices for owner confirmation)
INSERT INTO plans (id, gym_id, name, duration_months, price, is_active) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '1 Month Fitness', 1, 1000.00, true), -- TODO: Update price
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '3 Months Strength', 3, 2700.00, true), -- TODO: Update price
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '6 Months Transformation', 6, 5000.00, true), -- TODO: Update price
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '12 Months Annual VIP', 12, 9000.00, true) -- TODO: Update price
ON CONFLICT (id) DO NOTHING;
