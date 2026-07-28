import { Outlet, useNavigate } from 'react-router-dom'
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, Button } from '@mui/material'
import { Home, Users, Megaphone, FileText, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const menuItems = [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Citizens', icon: Users, path: '/citizens' },
    { label: 'Campaigns', icon: Megaphone, path: '/campaigns' },
    { label: 'Reports', icon: FileText, path: '/reports' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer sx={{ width: 260, '& .MuiDrawer-paper': { width: 260, bgcolor: '#0056A6', color: 'white' } }} variant="permanent">
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>SDICS</Typography>
        </Box>
        <List>
          {menuItems.map(item => (
            <ListItem button key={item.path} onClick={() => navigate(item.path)}>
              <ListItemIcon sx={{ color: 'white' }}><item.icon size={20} /></ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button fullWidth variant="contained" onClick={() => { logout(); navigate('/login') }} startIcon={<LogOut size={18} />}>
            Logout
          </Button>
        </Box>
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1 }}>SDICS System</Typography>
            <Typography variant="body2">{user?.email}</Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
