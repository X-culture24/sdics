import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/routes/AuthGuard';
import { MainLayout } from '@/layouts/MainLayout';
import { PageLoader } from '@/components/PageLoader';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const SessionExpiredPage = lazy(() => import('@/pages/auth/SessionExpiredPage'));
const UnauthorizedPage = lazy(() => import('@/pages/errors/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));
const ServerErrorPage = lazy(() => import('@/pages/errors/ServerErrorPage'));
const NetworkErrorPage = lazy(() => import('@/pages/errors/NetworkErrorPage'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CitizenList = lazy(() => import('@/pages/citizens/CitizenListPage'));
const CitizenDetails = lazy(() => import('@/pages/citizens/CitizenDetailsPage'));
const ImportPage = lazy(() => import('@/pages/imports/ImportPage'));
const CampaignsPage = lazy(() => import('@/pages/campaigns/CampaignsPage'));
const CampaignDetailsPage = lazy(() => import('@/pages/campaigns/CampaignDetailsPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/session-expired" element={<SessionExpiredPage />} />
        <Route path="/401" element={<UnauthorizedPage />} />
        <Route path="/403" element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="/network-error" element={<NetworkErrorPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="citizens" element={<CitizenList />} />
          <Route path="citizens/:id" element={<CitizenDetails />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailsPage />} />
          <Route path="imports" element={<ImportPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
