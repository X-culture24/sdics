import React from 'react';
import {
  Box,
  Button,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { SignalWifiOff as OfflineIcon, Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { buildTheme } from '@/theme';

const NetworkErrorPage: React.FC = () => (
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
            bgcolor: 'rgba(37, 99, 235, 0.12)',
            color: 'info.main',
            mb: 3,
          }}
        >
          <OfflineIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          No network connection
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          We couldn't connect to the server. Please check your internet connection and try again.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => location.reload()}>
            Retry Connection
          </Button>
          <Button component={Link} to="/dashboard" variant="contained" startIcon={<HomeIcon />}>
            Back to Dashboard
          </Button>
        </Stack>
      </Container>
    </Box>
  </ThemeProvider>
);

export default NetworkErrorPage;
