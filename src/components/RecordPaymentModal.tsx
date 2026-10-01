import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, Calendar, IndianRupee } from 'lucide-react';
import type { Member, Plan, PaymentMode } from '@/types';
import { getAllPlans, recordPayment } from '@/db/repository';
import { calculatePaymentPeriod } from '@/lib/feeStatus';
import { formatCurrency, formatDate } from '@/lib/dateUtils';
import { useAuth } from '@/app/AuthContext';

interface RecordPaymentModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  member,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paidOn, setPaidOn] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAllPlans().then((loadedPlans) => {
        setPlans(loadedPlans);
        // Default to member's current plan or the first active plan
        const defaultPlan =
          loadedPlans.find((p) => p.id === member.current_plan_id) ||
          loadedPlans.find((p) => p.is_active) ||
          loadedPlans[0];

        if (defaultPlan) {
          setSelectedPlanId(defaultPlan.id);
          setAmount(defaultPlan.price);
        }
      });
      setPaidOn(new Date().toISOString().split('T')[0]);
      setPaymentMode('upi');
      setNote('');
    }
  }, [isOpen, member]);

  if (!isOpen) return null;

  const currentPlan = plans.find((p) => p.id === selectedPlanId);
  const durationMonths = currentPlan ? currentPlan.duration_months : 1;
  const { period_start, period_end } = calculatePaymentPeriod(
    member.current_due_date,
    durationMonths,
    paidOn
  );

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setAmount(plan.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 0) return;

    try {
      setIsSubmitting(true);
      await recordPayment({
        member_id: member.id,
        plan_id: selectedPlanId || undefined,
        amount: Number(amount),
        paid_on: paidOn,
        mode: paymentMode,
        period_start,
        period_end,
        received_by: profile?.display_name || 'Front Desk',
        note: note.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to record payment', err);
      alert('Error saving payment locally. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-dark-850 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between bg-dark-900">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-aim-500" /> Record Fee Payment
            </h2>
            <p className="text-xs text-slate-400">
              For <span className="text-white font-medium">{member.full_name}</span> ({member.member_code})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Membership Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handlePlanChange(p.id)}
                  className={`cursor-pointer p-3 rounded-xl border text-sm transition-all ${
                    selectedPlanId === p.id
                      ? 'border-aim-500 bg-aim-500/10 text-white font-semibold shadow-sm ring-1 ring-aim-500'
                      : 'border-dark-700 bg-dark-800/60 text-slate-300 hover:border-dark-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">{p.name}</span>
                    <span className="text-aim-400 font-bold ml-1">₹{p.price}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {p.duration_months} {p.duration_months === 1 ? 'Month' : 'Months'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Amount and Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Amount (₹)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-semibold focus:outline-none focus:border-aim-500 focus:ring-1 focus:ring-aim-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-aim-500 text-sm"
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="cash">Cash (Front Desk)</option>
                <option value="card">Debit / Credit Card</option>
                <option value="other">Bank Transfer / Other</option>
              </select>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="date"
                required
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-aim-500 text-sm"
              />
            </div>
          </div>

          {/* Calculated Membership Period Banner */}
          <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-700/80 text-xs">
            <div className="text-slate-400 font-medium mb-1">New Membership Period:</div>
            <div className="flex items-center justify-between text-white font-semibold">
              <span>{formatDate(period_start)}</span>
              <span className="text-slate-500 font-normal">➔</span>
              <span className="text-aim-400">{formatDate(period_end)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Next fee due date will automatically advance to <strong className="text-slate-200">{formatDate(period_end)}</strong>.
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Optional Note / Transaction ID
            </label>
            <input
              type="text"
              placeholder="e.g. UPI ref #12345 or Cash receipt"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-aim-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-dark-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'Recording...' : `Confirm & Collect ${formatCurrency(amount)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
