import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Plus,
  Shield,
  CreditCard,
  MessageSquare,
  Building,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { getGymSettings, updateGymSettings, getAllPlans, savePlan } from '@/db/repository';
import type { Gym, Plan } from '@/types';
import { useAuth } from '@/app/AuthContext';
import { formatCurrency } from '@/lib/dateUtils';

export const SettingsScreen: React.FC = () => {
  const { userRole } = useAuth();

  const [gym, setGym] = useState<Gym | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New plan modal/inline state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState(1);
  const [newPlanPrice, setNewPlanPrice] = useState(1000);
  const [showAddPlan, setShowAddPlan] = useState(false);

  const loadData = async () => {
    try {
      const [g, p] = await Promise.all([getGymSettings(), getAllPlans()]);
      setGym(g || null);
      setPlans(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ROLE CHECK: If staff tries to access settings, block and show access denied!
  if (userRole !== 'owner') {
    return (
      <div className="bg-dark-850 border border-rose-500/30 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-white">Access Denied</h2>
        <p className="text-xs text-slate-300">
          Settings are restricted to the <strong>Owner</strong> account. Staff accounts cannot modify gym parameters, pricing, or templates.
        </p>
      </div>
    );
  }

  if (loading || !gym) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleSaveGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym) return;

    try {
      setIsSaving(true);
      await updateGymSettings(gym.id, gym);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update gym settings', err);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    await savePlan({
      name: newPlanName.trim(),
      duration_months: Number(newPlanDuration),
      price: Number(newPlanPrice),
      is_active: true,
    });

    setNewPlanName('');
    setShowAddPlan(false);
    await loadData();
  };

  const handleTogglePlan = async (plan: Plan) => {
    await savePlan({
      id: plan.id,
      name: plan.name,
      duration_months: plan.duration_months,
      price: plan.price,
      is_active: !plan.is_active,
    });
    await loadData();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-aim-500" /> Gym Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure AIM Fitness profile, message templates, plans, and reminder windows
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Saved Successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveGym} className="space-y-6">
        {/* SECTION 1: GYM PROFILE & BRANDING */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Building className="w-4 h-4 text-aim-500" /> Gym Information & Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Gym Name
              </label>
              <input
                type="text"
                required
                value={gym.name}
                onChange={(e) => setGym({ ...gym, name: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={gym.tagline}
                onChange={(e) => setGym({ ...gym, tagline: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Phone Number (Front Desk)
              </label>
              <input
                type="text"
                placeholder="TODO_PHONE_NUMBER"
                value={gym.phone}
                onChange={(e) => setGym({ ...gym, phone: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                WhatsApp Business Number
              </label>
              <input
                type="text"
                placeholder="TODO_WHATSAPP_NUMBER"
                value={gym.whatsapp_number}
                onChange={(e) => setGym({ ...gym, whatsapp_number: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Physical Address (Ratnagiri)
              </label>
              <input
                type="text"
                placeholder="TODO_FULL_ADDRESS, Ratnagiri, Maharashtra 415612"
                value={gym.address}
                onChange={(e) => setGym({ ...gym, address: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Google Maps Embed Link
              </label>
              <input
                type="text"
                placeholder="TODO_GOOGLE_MAPS_LINK"
                value={gym.map_link}
                onChange={(e) => setGym({ ...gym, map_link: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Instagram Profile URL
              </label>
              <input
                type="text"
                value={gym.instagram_url}
                onChange={(e) => setGym({ ...gym, instagram_url: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: REMINDER WINDOW & LANGUAGE */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-aim-500" /> Reminder Logic & Language
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Reminder Window (Days Before Due Date)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={gym.reminder_days_before}
                onChange={(e) => setGym({ ...gym, reminder_days_before: Number(e.target.value) })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500 font-bold"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Members due within this number of days will show under &ldquo;Due Soon&rdquo;.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Default Language
              </label>
              <select
                value={gym.language}
                onChange={(e) => setGym({ ...gym, language: e.target.value as any })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-aim-500"
              >
                <option value="en">English (Default)</option>
                <option value="mr">Marathi (मराठी - Ready)</option>
                <option value="hi">Hindi (हिंदी - Ready)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: MESSAGE TEMPLATES */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-aim-500" /> WhatsApp & SMS Message Templates
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Tokens: &#123;name&#125;, &#123;amount&#125;, &#123;due_date&#125;, &#123;days_left&#125;
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Fee Due Soon Template
              </label>
              <textarea
                rows={3}
                value={gym.template_fee_due}
                onChange={(e) => setGym({ ...gym, template_fee_due: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs font-mono focus:outline-none focus:border-aim-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Fee Overdue Template
              </label>
              <textarea
                rows={3}
                value={gym.template_fee_overdue}
                onChange={(e) => setGym({ ...gym, template_fee_overdue: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs font-mono focus:outline-none focus:border-aim-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Welcome New Member Template
              </label>
              <textarea
                rows={2}
                value={gym.template_welcome}
                onChange={(e) => setGym({ ...gym, template_welcome: e.target.value })}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs font-mono focus:outline-none focus:border-aim-500"
              />
            </div>
          </div>
        </div>

        {/* SAVE GYM SETTINGS BUTTON */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* SECTION 4: MEMBERSHIP PLANS MANAGEMENT */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-aim-500" /> Membership Plans & Rates
          </h2>
          <button
            onClick={() => setShowAddPlan(!showAddPlan)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Plan</span>
          </button>
        </div>

        {showAddPlan && (
          <form onSubmit={handleCreatePlan} className="p-4 rounded-xl bg-dark-900 border border-dark-750 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Create New Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2 Months Special"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-aim-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  required
                  value={newPlanDuration}
                  onChange={(e) => setNewPlanDuration(Number(e.target.value))}
                  className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-aim-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                  className="w-full bg-dark-850 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-aim-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddPlan(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-aim-500 text-white"
              >
                Add Plan
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                p.is_active
                  ? 'bg-dark-900 border-dark-750'
                  : 'bg-dark-950/60 border-dark-800 opacity-60'
              }`}
            >
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{p.name}</span>
                  {!p.is_active && (
                    <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.2 rounded bg-dark-800">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {p.duration_months} {p.duration_months === 1 ? 'Month' : 'Months'} •{' '}
                  <span className="text-aim-400 font-bold">{formatCurrency(p.price)}</span>
                </div>
              </div>

              <button
                onClick={() => handleTogglePlan(p)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700"
              >
                {p.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
