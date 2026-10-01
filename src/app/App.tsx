import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { Layout } from './Layout';
import { DashboardHome } from '@/features/dashboard/DashboardHome';
import { MemberList } from '@/features/members/MemberList';
import { MemberAddEdit } from '@/features/members/MemberAddEdit';
import { MemberProfile } from '@/features/members/MemberProfile';
import { MemberCardPrint } from '@/features/members/MemberCardPrint';
import { FeesScreen } from '@/features/fees/FeesScreen';
import { RemindersScreen } from '@/features/reminders/RemindersScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { ScanScreen } from '@/features/scan/ScanScreen';
import { AttendanceScreen } from '@/features/attendance/AttendanceScreen';
import { BackupScreen } from '@/features/backup/BackupScreen';
import { InstallPage } from '@/features/install/InstallPage';
import { PublicWebsite } from '@/features/website/PublicWebsite';
import { ReportsScreen } from '@/features/reports/ReportsScreen';
import { MemberPortal } from '@/features/portal/MemberPortal';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website (Default for all regular visitors/customers) */}
          <Route path="/" element={<PublicWebsite />} />
          <Route path="/website" element={<Navigate to="/" replace />} />
          <Route path="/portal" element={<MemberPortal />} />

          {/* Standalone Attendance Scanner Kiosk (Entry Gate) */}
          <Route path="/scan" element={<ScanScreen />} />

          {/* Owner & Staff Management Suite */}
          <Route path="/admin" element={<Layout />}>
            <Route index element={<DashboardHome />} />
            <Route path="scan" element={<ScanScreen />} />
            <Route path="attendance" element={<AttendanceScreen />} />
            <Route path="members" element={<MemberList />} />
            <Route path="members/add" element={<MemberAddEdit />} />
            <Route path="members/:id" element={<MemberProfile />} />
            <Route path="members/:id/card" element={<MemberCardPrint />} />
            <Route path="members/edit/:id" element={<MemberAddEdit />} />
            <Route path="fees" element={<FeesScreen />} />
            <Route path="reminders" element={<RemindersScreen />} />
            <Route path="reports" element={<ReportsScreen />} />
            <Route path="backup" element={<BackupScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="install" element={<InstallPage />} />
          </Route>

          {/* Legacy & direct shortcut redirects to /admin */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/attendance" element={<Navigate to="/admin/attendance" replace />} />
          <Route path="/members" element={<Navigate to="/admin/members" replace />} />
          <Route path="/fees" element={<Navigate to="/admin/fees" replace />} />
          <Route path="/reminders" element={<Navigate to="/admin/reminders" replace />} />
          <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/backup" element={<Navigate to="/admin/backup" replace />} />
          <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
          <Route path="/install" element={<Navigate to="/admin/install" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
