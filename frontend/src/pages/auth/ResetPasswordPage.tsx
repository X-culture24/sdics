import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, CssBaseline, Stack, TextField, ThemeProvider, Typography } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import { buildTheme } from '@/theme';
import { authApi } from '@/services/api/auth';

const ResetPasswordPage: React.FC = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get('token') ?? '';
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(
      yup.object({
        token: yup.string().trim().required('Token is required'),
        password: yup.string().min(8, 'Must be 8+ characters').required('Required'),
        confirm: yup
          .string()
          .oneOf([yup.ref('password')], 'Passwords do not match')
          .required('Please confirm password'),
      }),
    ),
    defaultValues: { token, password: '', confirm: '' },
  });

  const req = useMutation({
    mutationFn: (v: { token: string; password: string }) =>
      authApi.resetPassword({ token: v.token, password: v.password }),
    onSuccess: () => setDone(true),
  });

  return (
    <ThemeProvider theme={buildTheme('light')}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
        <Container maxWidth="sm">
          <Stack mb={3} direction="row" justifyContent="space-between" alignItems="center">
            <Button component={Link} to="/login" size="small" variant="outlined" startIcon={<BackIcon />}>
              Back to Login
            </Button>
          </Stack>
          <Card>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                Set a new password
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                Choose a strong password you haven't used before.
              </Typography>
              {done ? (
                <Alert severity="success">
                  Your password has been updated. You can now sign in with your new credentials.
                  <Box sx={{ mt: 2 }}>
                    <Button component={Link} to="/login" variant="contained">
                      Return to Login
                    </Button>
                  </Box>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit((v: any) => req.mutate(v))}>
                  <Stack spacing={2}>
                    <Controller
                      name="token"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Reset Token"
                          size="small"
                          fullWidth
                          error={!!(errors as any).token}
                          helperText={(errors as any).token?.message}
                        />
                      )}
                    />
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="New Password"
                          type="password"
                          size="small"
                          fullWidth
                          error={!!(errors as any).password}
                          helperText={(errors as any).password?.message}
                        />
                      )}
                    />
                    <Controller
                      name="confirm"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Confirm Password"
                          type="password"
                          size="small"
                          fullWidth
                          error={!!(errors as any).confirm}
                          helperText={(errors as any).confirm?.message}
                        />
                      )}
                    />
                    {req.isError ? (
                      <Alert severity="error">Could not reset password. Your token may be invalid or expired.</Alert>
                    ) : null}
                    <Button type="submit" variant="contained" fullWidth disabled={req.isPending}>
                      {req.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                      Reset Password
                    </Button>
                  </Stack>
                </form>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ResetPasswordPage;
