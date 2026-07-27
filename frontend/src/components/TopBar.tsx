import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Badge,
  Stack,
  Chip,
  Fade,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  DarkMode as DarkIcon,
  LightMode as LightIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { formatDate, getInitials } from '@/utils/format';
import kenyaCoatOfArms from '@/logo.jpeg';

interface Props {
  onMenuClick: () => void;
  drawerWidth: number;
}

export const TopBar: React.FC<Props> = ({ onMenuClick, drawerWidth }) => {
  const { user, logout, hasRole, setThemeMode, themeMode } = useAuth();
  const nav = useNavigate();
  const [userMenu, setUserMenu] = useState<null | HTMLElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const userInitials = getInitials(user?.fullName || '');

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 1, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={kenyaCoatOfArms}
              alt="Government of Kenya coat of arms"
              sx={{ width: 28, height: 28, objectFit: 'contain' }}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, lineHeight: 1.1, letterSpacing: 0.1 }}
              noWrap
            >
              NVRCMS
            </Typography>
            <Typography
              variant="caption"
              color="rgba(255,255,255,0.7)"
              sx={{ lineHeight: 1 }}
              noWrap
            >
              National Voter Registration Campaign Management System
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <Chip
          label={
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ pr: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {formatDate(new Date(), true)}
              </Typography>
            </Stack>
          }
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.12)',
            color: '#fff',
            '& .MuiChip-label': { p: 0, pl: 1 },
            display: { xs: 'none', sm: 'inline-flex' },
          }}
        />

        <Tooltip title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
          <IconButton
            color="inherit"
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            size="small"
          >
            {themeMode === 'light' ? <DarkIcon fontSize="small" /> : <LightIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton
            color="inherit"
            onClick={() => setNotifOpen((v) => !v)}
            size="small"
          >
            <Badge badgeContent={3} color="error" variant="dot" max={999}>
              <NotificationsIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Help & Support">
          <IconButton color="inherit" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ pl: 0.5 }}>
          <IconButton
            color="inherit"
            onClick={(e) => setUserMenu(e.currentTarget)}
            size="small"
            sx={{ p: 0.35 }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 12,
                  bgcolor: 'secondary.main',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {userInitials}
              </Avatar>
              <Stack
                direction="column"
                spacing={0}
                sx={{
                  textAlign: 'left',
                  minWidth: 0,
                  display: { xs: 'none', sm: 'flex' },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, lineHeight: 1.1 }}
                  noWrap
                >
                  {user?.fullName || 'User'}
                </Typography>
                <Typography
                  variant="caption"
                  color="rgba(255,255,255,0.7)"
                  sx={{ lineHeight: 1.1 }}
                  noWrap
                >
                  {user?.role?.name || 'Unauthorized'}
                </Typography>
              </Stack>
            </Stack>
          </IconButton>

          <Menu
            open={Boolean(userMenu)}
            anchorEl={userMenu}
            onClose={() => setUserMenu(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            TransitionComponent={Fade}
            PaperProps={{
              elevation: 6,
              sx: { width: 240, mt: 1, borderRadius: 2 },
            }}
          >
            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: 'secondary.main',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {userInitials}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                    {user?.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user?.email}
                  </Typography>
                  <Chip
                    size="small"
                    label={user?.role?.name}
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 0.75, fontWeight: 600 }}
                  />
                </Box>
              </Stack>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setUserMenu(null); nav('/settings'); }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="My Profile" />
            </MenuItem>
            <MenuItem onClick={() => { setUserMenu(null); nav('/settings'); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={async () => {
                setUserMenu(null);
                await logout();
                nav('/login', { replace: true });
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText sx={{ fontWeight: 600 }} primary="Sign Out" />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </AppBar>
  );
};
