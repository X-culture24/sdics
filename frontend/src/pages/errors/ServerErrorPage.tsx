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
import { Refresh as RefreshIcon, Home as HomeIcon, Report as ReportIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { buildTheme } from '@/theme';

const ServerErrorPage: React.FC = () => (
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
          <ReportIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography
          variant="h1"
          sx={{ fontWeight: 900, fontSize: { xs: 72, sm: 128 }, color: 'error.main' }}
        >
          500
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          The server encountered an internal error. Please refresh the page or try again later.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => location.reload()}>
            Refresh Page
          </Button>
          <Button component={Link} to="/dashboard" variant="contained" startIcon={<HomeIcon />}>
            Back to Dashboard
          </Button>
        </Stack>
      </Container>
    </Box>
  </ThemeProvider>
);

export default ServerErrorPage;
