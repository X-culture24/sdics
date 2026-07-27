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
import { Home as HomeIcon, SearchOff as SearchOffIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { buildTheme } from '@/theme';

const NotFoundPage: React.FC = () => (
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
            bgcolor: 'rgba(10, 37, 64, 0.12)',
            color: 'primary.main',
            mb: 3,
          }}
        >
          <SearchOffIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography
          variant="h1"
          sx={{ fontWeight: 900, fontSize: { xs: 72, sm: 128 }, color: 'primary.main' }}
        >
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          The page you are looking for doesn't exist or has been moved.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button component={Link} to="/dashboard" variant="contained" startIcon={<HomeIcon />}>
            Back to Dashboard
          </Button>
        </Stack>
      </Container>
    </Box>
  </ThemeProvider>
);

export default NotFoundPage;
