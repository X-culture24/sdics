import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  Link as MuiLink,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { HowToVote as VoteIcon, LockOutlined as LockIcon, Security as SecurityIcon } from '@mui/icons-material';
import { authApi } from '@/services/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { buildTheme } from '@/theme';
import type { LoginRequest } from '@/types/dto';

const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  remember: yup.boolean().optional(),
});

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as any)?.from ?? '/dashboard';

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest & { remember?: boolean }>({
    resolver: yupResolver(loginSchema as any) as any,
    defaultValues: { email: '', password: '', remember: true },
  });

  const doLogin = useMutation({
    mutationFn: auth.login,
    onError: (err: any) => {
      setError('root' as any, {
        message: err.message ?? 'Login failed. Please check your credentials.',
      });
    },
    onSuccess: () => {
      nav(redirectTo, { replace: true });
    },
  });

  return (
    <ThemeProvider theme={buildTheme('light')}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#f5f7fa',
          backgroundImage:
            'radial-gradient(1200px 600px at 0% 0%, rgba(10, 37, 64, 0.18), transparent 60%),' +
            'radial-gradient(1000px 600px at 100% 100%, rgba(14, 124, 59, 0.14), transparent 60%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(135deg, rgba(10, 37, 64, 0.85) 0%, rgba(10, 37, 64, 0.5) 60%, rgba(14, 124, 59, 0.18) 100%)',
            backdropFilter: 'blur(1px)',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', minHeight: '100vh', py: { xs: 4, md: 6 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 4, md: 6 }}
            sx={{ minHeight: 'calc(100vh - 64px)', alignItems: 'center' }}
          >
            <Box sx={{ flex: 1.1, color: '#fff' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={4}>
                <Box
                  sx={{
                    p: 1.1,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.14)',
                    color: '#fff',
                  }}
                >
                  <SecurityIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.3 }}>
                    NVRCMS
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    National Voter Registration Campaign Management System
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2, color: '#fff' }}>
                Every National ID.
                <br />
                <span
                  style={{
                    background: 'linear-gradient(90deg, #6ee7b7, #34d399)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Every voter registered.
                </span>
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 560, mb: 4 }}>
                NVRCMS helps government officers monitor registration progress across counties,
                districts, divisions and villages, calculate daily targets automatically, and
                ensure transparent progress reporting for national campaigns.
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {[
                  { icon: <VoteIcon fontSize="small" />, title: 'National Roll', desc: 'Daily KPIs by region' },
                  { icon: <LockIcon fontSize="small" />, title: 'Secure', desc: 'RBAC + JWT + Audit' },
                  { icon: <SecurityIcon fontSize="small" />, title: 'Compliant', desc: 'Access scoped by unit' },
                ].map((f) => (
                  <Card
                    key={f.title}
                    variant="outlined"
                    sx={{
                      minWidth: 160,
                      flex: 1,
                      bgcolor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(6px)',
                      color: '#fff',
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box
                        sx={{
                          p: 0.8,
                          width: 'fit-content',
                          borderRadius: 2,
                          bgcolor: 'rgba(14,124,59,0.3)',
                          color: '#6ee7b7',
                          mb: 1,
                        }}
                      >
                        {f.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {f.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {f.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
              <Card
                sx={{
                  width: '100%',
                  maxWidth: 460,
                  borderRadius: 4,
                  boxShadow: 12,
                  border: '1px solid rgba(17,24,39,0.06)',
                }}
              >
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Stack alignItems="center" spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 0.5 }}>
                      <VoteIcon fontSize="large" />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      Welcome back
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sign in with your government account to continue
                    </Typography>
                  </Stack>

                  {(doLogin.error as any)?.message || (errors as any).root ? (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                      {(doLogin.error as any)?.message || (errors as any).root?.message || 'Login failed'}
                    </Alert>
                  ) : null}

                  <form onSubmit={handleSubmit((v) => doLogin.mutate(v))}>
                    <Stack spacing={2}>
                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Email address"
                            size="small"
                            fullWidth
                            autoComplete="email"
                            error={!!errors.email}
                            helperText={errors.email?.message as any}
                          />
                        )}
                      />
                      <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Password"
                            type="password"
                            size="small"
                            fullWidth
                            autoComplete="current-password"
                            error={!!errors.password}
                            helperText={errors.password?.message as any}
                          />
                        )}
                      />
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: -0.5 }}>
                        <Controller
                          name="remember"
                          control={control}
                          render={({ field }) => (
                            <FormControlLabel
                              control={<Checkbox size="small" {...field} checked={Boolean(field.value)} />}
                              label={<Typography variant="caption">Remember me</Typography>}
                            />
                          )}
                        />
                        <Typography variant="caption">
                          <MuiLink component={Link} to="/forgot-password">
                            Forgot password?
                          </MuiLink>
                        </Typography>
                      </Stack>
                      <Divider sx={{ my: 0.5 }} />
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disableElevation
                        disabled={doLogin.isPending || isSubmitting}
                      >
                        {doLogin.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                        Sign In
                      </Button>
                    </Stack>
                  </form>

                  <Stack direction="row" justifyContent="center" mt={3}>
                    <Typography variant="caption" color="text.secondary">
                      © {new Date().getFullYear()} SDIC · e-Citizen platform
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default LoginPage;
