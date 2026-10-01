# AIM Fitness (Ratnagiri) — Gym Management System + Website (Offline-First PWA)

Official management system and Progressive Web App (PWA) for **AIM Fitness**, Ratnagiri, Maharashtra, India ([Instagram: @aimfitness_ratnagiri](https://www.instagram.com/aimfitness_ratnagiri/)).

---

## 🌟 Architecture & Highlights

- **Offline-First (Dexie.js / IndexedDB):** The application reads and writes to local on-device IndexedDB first. Front desk operations (registering members, recording payments, checking fee statuses, dispatching reminders) work 100% offline with zero network dependency.
- **Outbox Sync Engine:** Every local mutation is staged in an `outbox` queue to synchronize to Supabase when online.
- **Multi-Tenant Foundation:** Database tables include `gym_id`, indexed and secured with Row Level Security (RLS) policies.
- **Mobile-First UX:** Designed for mobile and tablet front desk usage with large touch targets, high contrast dark theme (`#0f1117`), and AIM Fitness brand accent (`#f97316`).

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Even with placeholder credentials or no internet connection, the system will start immediately in local offline mode using IndexedDB.

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🗄️ Supabase Setup & Deployment

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Run the SQL scripts in this exact sequence:
   1. `supabase/schema.sql` — Creates tables, extensions, foreign keys, and indexes.
   2. `supabase/rls_policies.sql` — Configures Row Level Security and access control.
   3. `supabase/seed.sql` — Seeds default AIM Fitness gym and membership plans.
4. Copy your project **URL** and **Anon Key** from `Project Settings > API` into your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```

---

## 📦 Deploying to Vercel

1. Push this repository to GitHub / GitLab.
2. In [Vercel](https://vercel.com), import the repository.
3. Framework Preset: **Vite**.
4. Set Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**.

---

## 🧪 Phase 1 Acceptance Testing Guide

### Test 1: Full Offline Operations (Airplane Mode / DevTools Offline)
1. In Chrome DevTools > Network tab, switch network throttling to **"Offline"** (or turn off Wi-Fi).
2. Click **"Add Member"** or the bottom **"+"** button.
3. Fill in the form: Name: `Mahesh Kulkarni`, Phone: `9822112233`, Plan: `1 Month General Fitness`, Collect first fee now: Checked.
4. Click **"Complete Registration"**.
5. Observe:
   - Member code `AIM-0001` is assigned.
   - Status immediately reflects **"Paid / Active"**.
   - Transaction is recorded in Payment History.

### Test 2: Fee Status Lifecycle (Overdue vs Due Soon vs Paid)
1. In the top bar, click the role button to confirm you are in **"Owner"** mode.
2. Register another member without initial payment (uncheck "Record first fee payment now").
3. Notice their status shows **"No Plan Active / Overdue"**.
4. Click **"Record Fee Payment"**, pick the plan and confirm payment.
5. Watch them instantly advance to **"Paid / Active"** and advance their due date.

### Test 3: WhatsApp, SMS & Call Reminder Dispatch
1. Open the **"Reminders"** page (`/reminders`).
2. Overdue members are prioritized at the top.
3. Click the **"WhatsApp"** button: it opens `https://wa.me/91...` with the pre-filled template containing the member's name and due date.
4. Click **"SMS"**: it opens `sms:+91...` using the mobile SIM without requiring internet.
5. Notice that clicking the action logs the reminder and displays the **"✓ Reminded Today"** badge.
6. Try the **"Remind All Overdue"** wizard to step through overdue members.

### Test 4: Role-Based Access Control (Owner vs Staff)
1. Click the role badge in the top right header and select **"Staff (Front Desk)"**.
2. Notice the **"Settings"** link disappears from the navigation.
3. Try navigating directly to `/settings` — an **"Access Denied"** banner is displayed.
4. Open a member's profile — notice the **"Delete"** button is hidden for Staff.
5. Switch back to **"Owner"** — full access to Settings and deletion is restored.

---

## 🎯 Phase 2 Acceptance Testing Guide (QR & Attendance)

### Test 5: Member ID Card & Anti-Tamper QR Generation
1. Navigate to any registered member's profile (e.g. `/members/<id>`).
2. Click **"ID Card / QR"** in the top action bar.
3. Observe the rendered card:
   - "AIM FITNESS" header with Ratnagiri tag.
   - Member photo/avatar, full name, member code (e.g. `AIM-0001`), phone number, and due date.
   - High-resolution anti-tamper QR code with embedded HMAC signature.
4. Click **"Download PDF"** to test generation of the CR80 card PDF (`AIM_Fitness_Card_AIM-0001.pdf`).
5. Click **"Print Card"** to verify browser print preview.

### Test 6: QR Camera Scanning & Color Results
1. Navigate to `/scan` (or click the glowing **"Scan"** button in the mobile bottom bar).
2. Point your camera at a member's QR card (you can display the card on another screen or phone).
3. Observe:
   - **Green Result:** If fees are paid/active, displays a green success screen with "Welcome {Name}", plan valid date, and approved chime.
   - **Amber Result:** If fees are due within 5 days, displays an amber warning with days left and a "Record Fee Now" button.
   - **Red Result:** If fees are overdue, displays a red alert with "Fees pending since {date}" and a prominent "Collect Fee Payment Now" button.

### Test 7: Duplicate Check-In Prevention (60-minute window)
1. Immediately scan the same member's QR code a second time.
2. Observe:
   - System displays **"Duplicate Check-In Prevented"** with the exact previous check-in time.
   - Duplicate entry is prevented in the database.

### Test 8: Manual Attendance & Attendance History
1. On `/scan`, click the **"Manual Search"** tab.
2. Search by member name or phone number.
3. Click **"Check In"** — attendance is logged with method `manual`.
4. Navigate to `/attendance`:
   - Verify today's total visits counter increments.
   - Verify breakdown between `QR Code` and `Manual` check-ins.
   - Check chronological timestamp logs.

---

## ⚡ Phase 3 Acceptance Testing Guide (Sync, PWA, Public Website)

### Test 9: Live Sync Indicator & Outbox Processing
1. In the top header bar, locate the **Sync Status Badge** (`Synced` / `X Pending` / `Offline`).
2. Click the badge to open the Supabase sync popover:
   - Displays Database backend status.
   - Displays pending outbox queue count.
   - Displays last sync timestamp.
   - Click **"Sync Now"** to trigger a manual push & pull cycle.
3. When offline, changes accumulate in the local `outbox` queue; when reconnected, the sync engine flushes all mutations to Supabase in FIFO order.

### Test 10: Multi-Sheet Excel & JSON Backup / Restore
1. In the navigation bar, click **"Backup"** (`/backup`).
2. Click **"Export as Excel Workbook (.xlsx)"**:
   - Opens an Excel file containing separate sheets for **Members**, **Payments**, **Attendance**, and **Plans**.
3. Click **"Export Full JSON Backup (.json)"**:
   - Downloads a complete raw database dump.
4. Test **Restore Database**:
   - Upload the downloaded JSON file to verify that records are merged and validated without data loss.

### Test 11: Installation Poster Page
1. Navigate to `/install`.
2. Inspect the high-resolution QR code pointing to the live app URL.
3. Verify the formatted instructions for **Android (Chrome)** and **iPhone (Safari)**.
4. Click **"Print Wall Poster"** to verify A4 printable poster formatting for the gym counter.

### Test 12: Public Marketing Website for AIM Fitness
1. In the top header bar, click the **"Website"** button (or navigate to `/website`).
2. Verify all sections:
   - **Hero Section:** "AIM HIGH. TRAIN HARD. STAY FIT." with direct WhatsApp & Free Trial CTA buttons.
   - **About Section:** Heavy strength equipment, cardio suite, certified coaches.
   - **Services Section:** Weight training, HIIT, 1-on-1 coaching, nutrition.
   - **Membership Rates:** Dynamically populated with prices and durations from the database.
   - **Opening Hours:** Morning, Evening, and Sunday shifts.
   - **Free Trial Form:** Fill name, phone, fitness goal, and click send — opens WhatsApp enquiry addressed to AIM Fitness front desk.
   - Click **"Staff Portal ➔"** in the website header to return instantly to management dashboard.

---

## 📊 Phase 4 Acceptance Testing Guide (Reports & Member Portal)

### Test 13: Financial Analytics & Operations Reports
1. In the navigation bar, click **"Reports"** (`/reports`).
2. Verify metrics:
   - Lifetime Collection total.
   - Monthly Collection Trend bar breakdown.
   - Payment Methods distribution (UPI, Cash, Card, Other).
   - Attendance volume breakdown (QR Scans vs Manual Front Desk).
3. Click **"Export Excel"**:
   - Generates an executive spreadsheet with summary and monthly tables.
4. Click **"Export PDF"**:
   - Generates an official executive PDF report (`AIM_Fitness_Executive_Report_...pdf`).

### Test 14: Member Self-Service Portal
1. Navigate to `/portal` (or click **"Member Portal"** from the public website header/footer).
2. Enter a member's mobile number (e.g. `9822123456`) or Member ID (e.g. `AIM-0001`).
3. Observe:
   - Renders the digital **AIM Fitness Member Card** with photo, name, and anti-tamper QR code.
   - Displays active plan name, renewal due date, and fee status badge.
   - Displays personal attendance workout logs with timestamps.
   - Displays payment receipts history.
   - Direct WhatsApp button for membership renewal.



