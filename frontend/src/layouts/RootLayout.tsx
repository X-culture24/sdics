import { useState } from 'react';
import { Box, AppBar, Toolbar, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Typography, IconButton } from '@mui/material';
import { useNavigate, Outlet } from 'react-router-dom';
import { Menu as MenuIcon, Logout as LogoutIcon, Dashboard as DashboardIcon, People as PeopleIcon, Campaign as CampaignIcon, BarChart as ReportsIcon, Upload as ImportsIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useAuthStore } from '@/features/authentication/store/authStore';
import { authService } from '@/services/api/authService';

const DRAWER_WIDTH = 260;

export default function RootLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(true);
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

  const menuItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Citizens', icon: <PeopleIcon />, path: '/citizens' },
    { label: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
    { label: 'Reports', icon: <ReportsIcon />, path: '/reports' },
    { label: 'Imports', icon: <ImportsIcon />, path: '/imports' },
    { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#FFFFFF',
          color: '#1F2937',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <Toolbar>
          <IconButton onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0056A6', flexGrow: 1 }}>
            SDICS
          </Typography>
          <Box onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#0056A6' }}>
              {user?.fullName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.fullName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                {user?.role?.name}
              </Typography>
            </Box>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => navigate('/settings')}>
              <SettingsIcon sx={{ mr: 1 }} />
              Profile Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            mt: 8,
            transition: 'width 0.3s ease',
          },
          transition: 'width 0.3s ease',
        }}
      >
        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  '&:hover': { backgroundColor: '#EAF4FF' },
                  borderRadius: '8px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon sx={{ color: '#0056A6' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          backgroundColor: '#F6F8FB',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
