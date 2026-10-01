import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserPlus,
  Camera,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  ShieldCheck,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  createMember,
  updateMember,
  getMemberById,
  generateNextMemberCode,
  getAllPlans,
  recordPayment,
} from '@/db/repository';
import { isValidIndianMobile, cleanIndianPhone } from '@/lib/messageTemplates';
import { compressImage } from '@/lib/imageCompression';
import { calculatePaymentPeriod } from '@/lib/feeStatus';
import type { Plan, PaymentMode } from '@/types';
import { useAuth } from '@/app/AuthContext';

export const MemberAddEdit: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [memberCode, setMemberCode] = useState<string>('AIM-....');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [altPhone, setAltPhone] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unspecified'>('male');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [joinDate, setJoinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Plans & Payment
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [collectPaymentNow, setCollectPaymentNow] = useState<boolean>(true);
  const [paymentAmount, setPaymentAmount] = useState<number>(1000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const loadedPlans = await getAllPlans();
        setPlans(loadedPlans);

        if (isEdit && id) {
          const existing = await getMemberById(id);
          if (existing) {
            setMemberCode(existing.member_code);
            setFullName(existing.full_name);
            setPhone(existing.phone);
            setAltPhone(existing.alt_phone || '');
            setGender(existing.gender || 'male');
            setDateOfBirth(existing.date_of_birth || '');
            setAddress(existing.address || '');
            setEmergencyContact(existing.emergency_contact || '');
            setJoinDate(existing.join_date);
            setPhotoUrl(existing.photo_url || '');
            setNotes(existing.notes || '');
            setStatus(existing.status);
            setSelectedPlanId(existing.current_plan_id || '');
            setCollectPaymentNow(false);
          }
        } else {
          // Add mode
          const nextCode = await generateNextMemberCode();
          setMemberCode(nextCode);

          const defaultPlan = loadedPlans.find((p) => p.is_active) || loadedPlans[0];
          if (defaultPlan) {
            setSelectedPlanId(defaultPlan.id);
            setPaymentAmount(defaultPlan.price);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isEdit]);

  // Handle plan change
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setPaymentAmount(plan.price);
    }
  };

  // Photo handling with browser compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress to under 150KB
      const compressedDataUrl = await compressImage(file, 150 * 1024);
      setPhotoUrl(compressedDataUrl);
    } catch (err) {
      console.error('Image compression failed', err);
      alert('Could not process photo. Please try a different image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validate phone number
    if (!isValidIndianMobile(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g., 9822123456).');
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanedPhone = cleanIndianPhone(phone);
      const cleanedAltPhone = altPhone ? cleanIndianPhone(altPhone) : undefined;

      const chosenPlan = plans.find((p) => p.id === selectedPlanId);
      const duration = chosenPlan ? chosenPlan.duration_months : 1;

      if (isEdit && id) {
        await updateMember(id, {
          full_name: fullName.trim(),
          phone: cleanedPhone,
          alt_phone: cleanedAltPhone,
          gender,
          date_of_birth: dateOfBirth || undefined,
          address: address.trim() || undefined,
          emergency_contact: emergencyContact.trim() || undefined,
          join_date: joinDate,
          photo_url: photoUrl || undefined,
          notes: notes.trim() || undefined,
          status,
          current_plan_id: selectedPlanId || undefined,
        });
        navigate(`/admin/members/${id}`);
      } else {
        // Compute initial due date if payment is collected or not
        let initialDueDate: string | undefined = undefined;
        let periodStart = joinDate;
        let periodEnd = joinDate;

        if (collectPaymentNow && chosenPlan) {
          const calc = calculatePaymentPeriod(undefined, duration, joinDate);
          periodStart = calc.period_start;
          periodEnd = calc.period_end;
          initialDueDate = periodEnd;
        }

        const newMember = await createMember({
          member_code: memberCode,
          full_name: fullName.trim(),
          phone: cleanedPhone,
          alt_phone: cleanedAltPhone,
          gender,
          date_of_birth: dateOfBirth || undefined,
          photo_url: photoUrl || undefined,
          address: address.trim() || undefined,
          emergency_contact: emergencyContact.trim() || undefined,
          join_date: joinDate,
          current_plan_id: selectedPlanId || undefined,
          current_due_date: initialDueDate,
          status: 'active',
          notes: notes.trim() || undefined,
        });

        // Record initial payment if requested
        if (collectPaymentNow && paymentAmount > 0) {
          await recordPayment({
            member_id: newMember.id,
            plan_id: selectedPlanId || undefined,
            amount: Number(paymentAmount),
            paid_on: joinDate,
            mode: paymentMode,
            period_start: periodStart,
            period_end: periodEnd,
            received_by: profile?.display_name || 'Front Desk',
            note: 'Registration initial membership fee',
          });
        }

        navigate(`/admin/members/${newMember.id}`);
      }
    } catch (err) {
      console.error('Failed to save member', err);
      setErrorMsg('Failed to save member details. Please check inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-dark-800 text-aim-400 border border-dark-700 font-bold">
          ID: {memberCode}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-aim-500" />
          {isEdit ? 'Edit Member Profile' : 'New Member Registration'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          AIM Fitness • Ratnagiri Front Desk Enrollment
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: PHOTO & BASIC INFO */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-aim-500" /> Personal Details
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Photo Avatar / Camera */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl bg-dark-900 border-2 border-dashed border-dark-650 hover:border-aim-500 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all relative group"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 group-hover:text-aim-400">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-semibold">Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                  Change
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <span className="text-[10px] text-slate-500 mt-1.5">Auto compressed &lt;150KB</span>
            </div>

            {/* Name & Phone */}
            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Patil"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Mobile Phone (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">+91</span>
                    <input
                      type="tel"
                      required
                      placeholder="9822XXXXXX"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-11 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Alt Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Optional secondary"
                    maxLength={10}
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Gender & DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Join Date
              </label>
              <input
                type="date"
                required
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>
          </div>

          {/* Address & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Address / Area (Ratnagiri)
              </label>
              <input
                type="text"
                placeholder="e.g. Shivaji Nagar, Ratnagiri"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Emergency Contact (Name & No.)
              </label>
              <input
                type="text"
                placeholder="e.g. Father: 9822XXXXXX"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: MEMBERSHIP PLAN & INITIAL PAYMENT */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-aim-500" /> Membership Plan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {plans.map((p) => (
              <div
                key={p.id}
                onClick={() => handlePlanChange(p.id)}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                  selectedPlanId === p.id
                    ? 'border-aim-500 bg-aim-500/10 text-white ring-1 ring-aim-500'
                    : 'border-dark-750 bg-dark-900/60 text-slate-300 hover:border-dark-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="text-aim-400 font-bold">₹{p.price}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {p.duration_months} {p.duration_months === 1 ? 'Month' : 'Months'} duration
                </div>
              </div>
            ))}
          </div>

          {!isEdit && (
            <div className="pt-3 border-t border-dark-750/70 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectPaymentNow}
                  onChange={(e) => setCollectPaymentNow(e.target.checked)}
                  className="w-4 h-4 rounded text-aim-500 bg-dark-900 border-dark-700 focus:ring-aim-500"
                />
                <span className="text-sm font-bold text-white">Record first fee payment now</span>
              </label>

              {collectPaymentNow && (
                <div className="p-4 rounded-xl bg-dark-900 border border-dark-750 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Fee Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-aim-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-aim-500"
                    >
                      <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="cash">Cash (Front Desk)</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {isEdit && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-aim-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Member Notes (Fitness Goals, Health Conditions)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Weight loss goal, knee caution, referred by member..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-aim-500"
            />
          </div>
        </div>

        {/* PRIVACY CONSENT NOTE */}
        <div className="p-3.5 rounded-xl bg-dark-850/60 border border-dark-750 flex items-start gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Privacy Notice:</strong> Member phone numbers and photos are strictly confidential and used solely for AIM Fitness club membership, attendance, and fee reminders.
          </p>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-dark-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Complete Registration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
