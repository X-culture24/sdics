import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './layouts/Layout'
import Login from './features/auth/pages/Login'
import Dashboard from './features/dashboard/pages/Dashboard'
import Citizens from './features/citizens/pages/Citizens'
import Campaigns from './features/campaigns/pages/Campaigns'
import Reports from './features/reports/pages/Reports'
import Settings from './features/settings/pages/Settings'

const queryClient = new QueryClient()

const theme = createTheme({
  palette: {
    primary: { main: '#0056A6', light: '#1976D2' },
    secondary: { main: '#1976D2' },
    background: { default: '#F5F7FA', paper: '#FFFFFF' },
    success: { main: '#2E7D32' },
    warning: { main: '#F9A825' },
    error: { main: '#D32F2F' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/citizens" element={<ProtectedRoute><Citizens /></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
