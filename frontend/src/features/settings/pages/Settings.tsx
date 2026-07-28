import { Box, Card, Typography, TextField, Button, Divider } from '@mui/material';
import { useAuthStore } from '@/features/authentication/store/authStore';

export default function Settings() {
  const { user } = useAuthStore();

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Settings
      </Typography>

      <Card sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Profile Information
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <TextField label="Full Name" value={user?.fullName || ''} fullWidth disabled />
          <TextField label="Email" type="email" value={user?.email || ''} fullWidth disabled />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Change Password
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
          <TextField label="Current Password" type="password" fullWidth />
          <TextField label="New Password" type="password" fullWidth />
          <TextField label="Confirm Password" type="password" fullWidth />
          <Button variant="contained">Update Password</Button>
        </Box>
      </Card>
    </Box>
  );
}
