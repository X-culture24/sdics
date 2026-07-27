import React from 'react';
import { Box, Button, Container, CssBaseline, Stack, ThemeProvider, Typography } from '@mui/material';
import { ArrowBack as BackIcon, Home as HomeIcon, VpnKey as LockIcon } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { buildTheme } from '@/theme';

export const UnauthorizedPage: React.FC = () => {
  const nav = useNavigate();
  return (
    <ThemeProvider theme={buildTheme('light')}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 10 }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              mx: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              bgcolor: 'rgba(220,38,38,0.12)',
              color: 'error.main',
              mb: 3,
            }}
          >
            <LockIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h1" sx={{ fontWeight: 900, fontSize: { xs: 72, sm: 96 }, color: 'primary.main' }}>
            403
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You do not have permission to view this page. If you believe this is an error, contact your
            system administrator to request access.
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button component={Link} to="/dashboard" variant="contained" startIcon={<HomeIcon />}>
              Back to Dashboard
            </Button>
            <Button variant="outlined" startIcon={<BackIcon />} onClick={() => nav(-1)}>
              Go Back
            </Button>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default UnauthorizedPage;
