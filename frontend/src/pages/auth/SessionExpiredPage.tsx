import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { WarningAmber as SessionIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { buildTheme } from '@/theme';

const SessionExpiredPage: React.FC = () => {
  const nav = useNavigate();
  return (
    <ThemeProvider theme={buildTheme('light')}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 8 }}>
        <Container maxWidth="sm">
          <Card variant="outlined">
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  mx: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: 'rgba(245, 158, 11, 0.12)',
                  color: 'warning.main',
                  mb: 2,
                }}
              >
                <SessionIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Your session has expired
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You have been signed out due to inactivity or because another session was started
                for the same account. Please sign in again to continue.
              </Typography>
              <Stack direction="row" spacing={1.5} justifyContent="center">
                <Button component={Link} to="/login" variant="contained" endIcon={<ArrowIcon />}>
                  Sign In Again
                </Button>
                <Button variant="outlined" onClick={() => nav(-1)}>
                  Go Back
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default SessionExpiredPage;
