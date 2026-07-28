import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/theme/theme';
import { queryClient } from '@/lib/queryClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import RootLayout from '@/layouts/RootLayout';
import Login from '@/features/authentication/pages/Login';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import Citizens from '@/features/citizens/pages/CitizensPage';
import Campaigns from '@/features/campaigns/pages/CampaignsPage';
import Reports from '@/features/reports/pages/ReportsPage';
import Imports from '@/features/imports/pages/ImportsPage';
import Settings from '@/features/settings/pages/Settings';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <RootLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/citizens" element={<Citizens />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/imports" element={<Imports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
