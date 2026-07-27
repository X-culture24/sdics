import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation } from '@tanstack/react-query';
import { buildTheme } from '@/theme';
import { authApi } from '@/services/api/auth';

const ForgotPasswordPage: React.FC = () => {
  const nav = useNavigate();
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(
      yup.object({
        email: yup.string().trim().email('Enter a valid email').required('Email is required'),
      }),
    ),
    defaultValues: { email: '' },
  });

  const req = useMutation({
    mutationFn: (v: { email: string }) => authApi.forgotPassword(v.email),
    onSuccess: () => setSent(true),
  });

  return (
    <ThemeProvider theme={buildTheme('light')}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
        <Container maxWidth="sm">
          <Stack mb={3} direction="row" justifyContent="space-between" alignItems="center">
            <Button
              component={Link}
              to="/login"
              size="small"
              variant="outlined"
              startIcon={<BackIcon />}
            >
              Back to Login
            </Button>
          </Stack>
          <Card>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                Reset your password
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                Enter your registered email address and we'll send you reset instructions.
              </Typography>

              {sent ? (
                <Alert severity="success">
                  Reset instructions have been sent to your email. If you don't receive an email within 5
                  minutes, please check your spam folder or contact your administrator.
                  <Box sx={{ mt: 2 }}>
                    <Button component={Link} to="/login" variant="contained">
                      Return to Login
                    </Button>
                  </Box>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit((v) => req.mutate(v))}>
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
                          autoFocus
                          error={!!errors.email}
                          helperText={(errors.email as any)?.message}
                        />
                      )}
                    />
                    {req.isError ? (
                      <Alert severity="error">Could not send the reset email. Please try again.</Alert>
                    ) : null}
                    <Button type="submit" variant="contained" fullWidth disabled={req.isPending}>
                      {req.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                      Send Reset Link
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

export default ForgotPasswordPage;
