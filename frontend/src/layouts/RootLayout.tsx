import { useState } from 'react';
import { Box, AppBar, Toolbar, Avatar, Menu, MenuItem, Divider, Typography, Tabs, Tab } from '@mui/material';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Logout as LogoutIcon, Dashboard as DashboardIcon, People as CitizensIcon, Campaign as CampaignIcon, BarChart as ReportsIcon, Settings as SettingsIcon, Storage as DatasetIcon } from '@mui/icons-material';
import { useAuthStore } from '@/features/authentication/store/authStore';
import { authService } from '@/services/api/authService';

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Citizens', icon: <CitizensIcon />, path: '/citizens' },
    { label: 'Datasets', icon: <DatasetIcon />, path: '/datasets' },
    { label: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
    { label: 'Reports', icon: <ReportsIcon />, path: '/reports' },
  ];

  const currentTabIndex = navItems.findIndex(item => location.pathname === item.path);
  const activeTabIndex = currentTabIndex >= 0 ? currentTabIndex : 0;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    navigate(navItems[newValue].path);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F6F8FB' }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: '#FFFFFF',
          color: '#1F2937',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          borderBottom: '1px solid #E5E7EB',
          zIndex: 1200,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
          {/* Logo & Branding */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0056A6 0%, #004B91 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '18px',
              }}
            >
              S
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0056A6 0%, #2563EB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.5px',
              }}
            >
              SDICS
            </Typography>
          </Box>

          {/* User Menu */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: '8px',
              '&:hover': { backgroundColor: '#F3F4F6' },
              transition: 'background-color 0.2s',
            }}
          >
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#0056A6', fontWeight: 600 }}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F2937' }}>
                {user?.fullName || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                {user?.role?.name || 'Admin'}
              </Typography>
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: {
                mt: 1,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
              },
            }}
          >
            <MenuItem
              onClick={() => {
                navigate('/settings');
                setAnchorEl(null);
              }}
              sx={{ py: 1 }}
            >
              <SettingsIcon sx={{ mr: 1.5, fontSize: 20 }} />
              <Typography variant="body2">Profile Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1 }}>
              <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* Tab Navigation */}
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            px: 3,
          }}
        >
          <Tabs
            value={activeTabIndex}
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#0056A6',
                height: '3px',
              },
              '& .MuiTab-root': {
                fontWeight: 500,
                fontSize: '14px',
                color: '#6B7280',
                textTransform: 'none',
                minWidth: 'auto',
                px: 2,
                py: 1.5,
                display: 'flex',
                flexDirection: 'row',
                gap: 1,
                '&.Mui-selected': {
                  color: '#0056A6',
                  fontWeight: 600,
                },
                '&:hover': {
                  color: '#0056A6',
                  backgroundColor: '#F9FAFB',
                },
              },
            }}
          >
            {navItems.map((item) => (
              <Tab
                key={item.path}
                icon={item.icon}
                iconPosition="start"
                label={item.label}
              />
            ))}
          </Tabs>
        </Box>
      </AppBar>

      {/* Main Content Area - Full Width */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '120px', // AppBar height + Tabs height
          px: 4,
          py: 3,
          backgroundColor: '#F6F8FB',
          width: '100%',
          maxWidth: '100%',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
