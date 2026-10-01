import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BellRing,
  Settings,
  UserCheck,
  Shield,
  Menu,
  X,
  QrCode,
  CalendarCheck,
  Globe,
  Database,
  BarChart3,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';

export const Layout: React.FC = () => {
  const { userRole, profile, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items grouped logically
  const operationsNav = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Scan QR Code', path: '/admin/scan', icon: QrCode },
    { name: 'Attendance Logs', path: '/admin/attendance', icon: CalendarCheck },
    { name: 'Members Directory', path: '/admin/members', icon: Users },
  ];

  const financesNav = [
    { name: 'Fees & Payments', path: '/admin/fees', icon: CreditCard },
    { name: 'Fee Reminders', path: '/admin/reminders', icon: BellRing },
  ];

  const adminNav = [
    { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { name: 'Backup & Restore', path: '/admin/backup', icon: Database },
    { name: 'Gym Settings', path: '/admin/settings', icon: Settings },
  ];

  // Helper to render nav link
  const renderNavLink = (item: { name: string; path: string; icon: React.FC<{ className?: string }> }, onClickExtra?: () => void) => {
    const isExact = item.path === '/admin';
    const isActive = isExact
      ? location.pathname === '/admin' || location.pathname === '/admin/'
      : location.pathname.startsWith(item.path);

    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => {
          if (onClickExtra) onClickExtra();
        }}
        className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
          isActive
            ? 'bg-aim-500/15 text-aim-400 border border-aim-500/30 shadow-sm font-bold'
            : 'text-slate-300 hover:text-white hover:bg-dark-850 border border-transparent'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-aim-400' : 'text-slate-400'}`} />
        <span className="truncate">{item.name}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col md:flex-row">
      {/* ========================================================= */}
      {/* DESKTOP LEFT SIDEBAR (Visible on md: and up)               */}
      {/* ========================================================= */}
      <aside className="hidden md:flex flex-col w-64 bg-dark-950 border-r border-dark-800 h-screen sticky top-0 shrink-0 select-none">
        {/* Brand Header */}
        <div
          className="p-5 border-b border-dark-800/80 cursor-pointer flex items-center space-x-3"
          onClick={() => navigate('/admin')}
        >
          <div className="w-10 h-10 rounded-xl bg-aim-500/10 border border-aim-500/30 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="AIM Fitness"
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.fallback-text')) {
                  const fallback = document.createElement('span');
                  fallback.className = 'fallback-text text-aim-500 font-black text-sm tracking-tighter';
                  fallback.innerText = 'AIM';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-base tracking-wider text-white truncate">
                AIM FITNESS
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-aim-500/20 text-aim-400 border border-aim-500/30 shrink-0">
                Ratnagiri
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              Gymming Beyond Tradition
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Operations */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Operations
            </div>
            <div className="space-y-1">
              {operationsNav.map((item) => renderNavLink(item))}
            </div>
          </div>

          {/* Finances */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Finances
            </div>
            <div className="space-y-1">
              {financesNav.map((item) => renderNavLink(item))}
            </div>
          </div>

          {/* Administration (Owner Only) */}
          {userRole === 'owner' && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Administration
              </div>
              <div className="space-y-1">
                {adminNav.map((item) => renderNavLink(item))}
              </div>
            </div>
          )}

          {/* Public Views */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Public & Member
            </div>
            <div className="space-y-1">
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-dark-850 transition-colors"
              >
                <span className="flex items-center space-x-3">
                  <Globe className="w-4 h-4 text-aim-400" />
                  <span>Public Website</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => navigate('/portal')}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-dark-850 transition-colors"
              >
                <span className="flex items-center space-x-3">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Member Portal</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Sync & Role Switcher */}
        <div className="p-3.5 border-t border-dark-800 bg-dark-950/60 space-y-2">
          {/* Live Sync Badge */}
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold text-slate-400">Offline Sync:</span>
            <SyncStatusBadge />
          </div>

          {/* Role Pill Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xs font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                {userRole === 'owner' ? (
                  <Shield className="w-3.5 h-3.5 text-aim-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="text-white capitalize">{userRole} Account</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Switch</span>
            </button>

            {roleSwitcherOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[11px] text-slate-400 font-medium border-b border-dark-800 mb-1">
                  Active: <strong className="text-white">{profile?.display_name}</strong>
                </div>
                <button
                  onClick={() => {
                    switchRole('owner');
                    setRoleSwitcherOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${
                    userRole === 'owner' ? 'bg-aim-500/20 text-aim-400 font-bold' : 'hover:bg-dark-800 text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Owner (Admin)
                  </span>
                  {userRole === 'owner' && <span className="text-[10px] font-mono">Active</span>}
                </button>
                <button
                  onClick={() => {
                    switchRole('staff');
                    setRoleSwitcherOpen(false);
                    if (window.location.pathname.startsWith('/settings')) navigate('/');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${
                    userRole === 'staff' ? 'bg-aim-500/20 text-aim-400 font-bold' : 'hover:bg-dark-800 text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5" /> Front Desk Staff
                  </span>
                  {userRole === 'staff' && <span className="text-[10px] font-mono">Active</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE TOP HEADER (Visible on < md)                       */}
      {/* ========================================================= */}
      <header className="md:hidden sticky top-0 z-40 bg-dark-950/95 backdrop-blur-md border-b border-dark-800 px-4 py-3 flex items-center justify-between">
        <div
          className="flex items-center space-x-2.5 cursor-pointer min-w-0"
          onClick={() => navigate('/admin')}
        >
          <div className="w-9 h-9 rounded-xl bg-aim-500/10 border border-aim-500/30 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.png" alt="AIM Fitness" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-base tracking-wider text-white">AIM FITNESS</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-aim-500/20 text-aim-400 border border-aim-500/30">
                Ratnagiri
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <SyncStatusBadge />

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-dark-850 hover:bg-dark-800 border border-dark-750"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MOBILE FULL-SCREEN SLIDE DRAWER (When menu is toggled)    */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-dark-950 border-r border-dark-800 h-full flex flex-col p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-dark-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-aim-500/10 border border-aim-500/30 flex items-center justify-center p-1">
                  <img src="/logo.png" alt="AIM Fitness" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="font-black text-sm tracking-wider text-white">AIM FITNESS</span>
                  <p className="text-[10px] text-slate-400">Ratnagiri</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-dark-850"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                  Operations
                </div>
                <div className="space-y-1">
                  {operationsNav.map((item) => renderNavLink(item, () => setMobileMenuOpen(false)))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                  Finances
                </div>
                <div className="space-y-1">
                  {financesNav.map((item) => renderNavLink(item, () => setMobileMenuOpen(false)))}
                </div>
              </div>

              {userRole === 'owner' && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                    Administration
                  </div>
                  <div className="space-y-1">
                    {adminNav.map((item) => renderNavLink(item, () => setMobileMenuOpen(false)))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                  Public & Info
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      navigate('/');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-dark-850"
                  >
                    <Globe className="w-4 h-4 text-aim-400" />
                    <span>Public Website</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/portal');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-dark-850"
                  >
                    <Smartphone className="w-4 h-4 text-sky-400" />
                    <span>Member Portal</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/install');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-dark-850"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Install App QR Poster</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Role switch in mobile drawer */}
            <div className="pt-3 border-t border-dark-800 space-y-2">
              <div className="text-[11px] text-slate-400 font-semibold">
                Logged in as: <strong className="text-white capitalize">{userRole}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    switchRole('owner');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    userRole === 'owner' ? 'bg-aim-500 text-white' : 'bg-dark-800 text-slate-300'
                  }`}
                >
                  Owner
                </button>
                <button
                  onClick={() => {
                    switchRole('staff');
                    setMobileMenuOpen(false);
                    if (window.location.pathname.startsWith('/settings')) navigate('/');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    userRole === 'staff' ? 'bg-aim-500 text-white' : 'bg-dark-800 text-slate-300'
                  }`}
                >
                  Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN VIEWPORT CONTENT AREA                                */}
      {/* ========================================================= */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top bar with quick breadcrumb / quick button */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-dark-800/80 bg-dark-950/40 backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">AIM Fitness Management</span>
            <span>/</span>
            <span className="text-aim-400 font-bold capitalize">
              {location.pathname === '/admin'
                ? 'Dashboard'
                : location.pathname.replace('/admin/', '').replace(/-/g, ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/admin/scan')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-md shadow-aim-500/20 flex items-center gap-1.5 transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Quick Scan</span>
            </button>

            <button
              onClick={() => navigate('/admin/members/add')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-dark-850 hover:bg-dark-800 text-slate-200 border border-dark-750 flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-aim-400" />
              <span>+ Add Member</span>
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR                              */}
      {/* ========================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/95 backdrop-blur-lg border-t border-dark-800 pb-safe pt-1.5 px-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex flex-col items-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-aim-500 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/admin/members"
            className={({ isActive }) =>
              `flex flex-col items-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-aim-500 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Members</span>
          </NavLink>

          {/* Central Elevated Scan Button */}
          <NavLink
            to="/admin/scan"
            className="flex flex-col items-center px-2 text-aim-500 -mt-5 shrink-0"
          >
            <div className="w-12 h-12 rounded-full bg-aim-500 hover:bg-aim-600 text-white flex items-center justify-center shadow-xl shadow-aim-500/40 border-2 border-dark-950 transition-transform active:scale-95">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black mt-0.5 text-white">Scan</span>
          </NavLink>

          <NavLink
            to="/admin/fees"
            className={({ isActive }) =>
              `flex flex-col items-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-aim-500 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <CreditCard className="w-5 h-5 mb-0.5" />
            <span>Fees</span>
          </NavLink>

          <NavLink
            to="/admin/reminders"
            className={({ isActive }) =>
              `flex flex-col items-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-aim-500 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <BellRing className="w-5 h-5 mb-0.5" />
            <span>Reminders</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
