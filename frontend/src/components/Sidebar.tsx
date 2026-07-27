import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  Toolbar,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PeopleAlt as PeopleAltIcon,
  Campaign as CampaignIcon,
  UploadFile as UploadFileIcon,
  Description as DescriptionIcon,
  HistoryEdu as HistoryEduIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { NAV_ITEMS, ROLE_NAMES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import kenyaCoatOfArms from '@/logo.jpeg';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Dashboard: DashboardIcon,
  PeopleAlt: PeopleAltIcon,
  Campaign: CampaignIcon,
  UploadFile: UploadFileIcon,
  Description: DescriptionIcon,
  HistoryEdu: HistoryEduIcon,
  Group: GroupIcon,
  Settings: SettingsIcon,
};

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  drawerWidth: number;
}

export const Sidebar: React.FC<Props> = ({ mobileOpen, onCloseMobile, drawerWidth }) => {
  const { user, canAccessNav, hasRole } = useAuth();
  const loc = useLocation();

  const items = NAV_ITEMS.filter((it) => canAccessNav(it.roles));

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: (t) => (t.palette.mode === 'light' ? '#FFFFFF' : '#0a1730'),
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 0.25,
          py: 2,
          px: 2.5,
          bgcolor: (t) =>
            t.palette.mode === 'light'
              ? 'linear-gradient(135deg, #0a2540 0%, #1c3c66 100%)'
              : '#061225',
          color: '#fff',
          backgroundImage: (t) =>
            t.palette.mode === 'light'
              ? 'linear-gradient(135deg, #0a2540 0%, #1c3c66 100%)'
              : undefined,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={<FlagIcon sx={{ fontSize: 10, color: '#fff' }} />}
            sx={{ '& .MuiBadge-badge': { bgcolor: '#0e7c3b' } }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.18)',
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
                sx={{ width: 34, height: 34, objectFit: 'contain' }}
              />
            </Box>
          </Badge>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
              NVRCMS
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: 10.5,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1,
                letterSpacing: 0.3,
              }}
            >
              Government of Kenya · e-Citizen
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.3,
            display: 'block',
            mb: 0.75,
            pl: 1,
          }}
        >
          MENU
        </Typography>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {items.map((it) => {
            const Icon = ICON_MAP[it.icon] ?? DashboardIcon;
            const active =
              it.path === '/dashboard'
                ? loc.pathname === '/dashboard'
                : loc.pathname.startsWith(it.path);
            return (
              <ListItem key={it.key} disablePadding>
                <ListItemButton
                  component={NavLink}
                  to={it.path}
                  onClick={onCloseMobile}
                  sx={{
                    borderRadius: 2,
                    px: 1.25,
                    bgcolor: active ? (t) => (t.palette.mode === 'light' ? 'rgba(10, 37, 64, 0.08)' : 'rgba(255,255,255,0.08)') : 'transparent',
                    color: active ? 'primary.main' : 'text.primary',
                    '&.Mui-selected': {
                      bgcolor: (t) => (t.palette.mode === 'light' ? 'rgba(10, 37, 64, 0.08)' : 'rgba(255,255,255,0.08)'),
                    },
                    '&:hover': {
                      bgcolor: (t) =>
                        t.palette.mode === 'light' ? 'rgba(10, 37, 64, 0.04)' : 'rgba(255,255,255,0.04)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{
                      sx: { fontWeight: active ? 700 : 500, fontSize: 13.5 },
                    }}
                    primary={it.label}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 1.5 }} />
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: (t) =>
              t.palette.mode === 'light' ? 'rgba(14, 124, 59, 0.08)' : 'rgba(52, 211, 153, 0.08)',
            border: (t) =>
              `1px solid ${t.palette.mode === 'light' ? 'rgba(14,124,59,0.2)' : 'rgba(52,211,153,0.2)'}`,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', fontWeight: 700, mb: 0.25 }}
          >
            LOGGED IN AS
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {user?.fullName || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.role?.name || '—'}
          </Typography>
          <Box sx={{ mt: 0.75 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'inline-block',
                px: 1,
                py: 0.25,
                borderRadius: 999,
                bgcolor: (t) => (t.palette.mode === 'light' ? '#fff' : 'rgba(255,255,255,0.05)'),
                color: hasRole(ROLE_NAMES.SYSADMIN) ? 'secondary.main' : 'primary.main',
                fontWeight: 700,
                fontSize: 10.5,
              }}
            >
              {(user?.role?.name ?? 'Viewer').toUpperCase()}
            </Typography>
          </Box>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 1.5,
            display: 'block',
            textAlign: 'center',
            fontSize: 10.5,
          }}
        >
          v0.1.0 · © {new Date().getFullYear()} SDIC
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          display: { xs: 'none', md: 'block' },
        }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="permanent"
          open
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          {content}
        </Drawer>
      </Box>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {content}
      </Drawer>
    </>
  );
};
