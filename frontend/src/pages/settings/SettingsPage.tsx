import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/api/settings';
import { useAuth } from '@/contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const { themeMode, setThemeMode } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.list(),
  });

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => settingsApi.update(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const themeEnabled = themeMode === 'dark';

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account preferences and system display options.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Profile Preferences
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Typography variant="body2">Dark mode</Typography>
              <Switch
                checked={themeEnabled}
                onChange={(_, checked) => setThemeMode(checked ? 'dark' : 'light')}
              />
            </Stack>
            <TextField size="small" label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <TextField size="small" label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Application Settings
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {settings.isError ? <Alert severity="warning">Could not load settings.</Alert> : null}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {(settings.data?.data ?? []).map((item) => (
              <FormControl key={item.id} size="small" sx={{ minWidth: 220 }}>
                <InputLabel>{item.key}</InputLabel>
                <Select
                  label={item.key}
                  value={item.value}
                  onChange={(e) => updateSetting.mutate({ key: item.key, value: e.target.value })}
                >
                  <MenuItem value="true">Enabled</MenuItem>
                  <MenuItem value="false">Disabled</MenuItem>
                </Select>
              </FormControl>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default SettingsPage;
