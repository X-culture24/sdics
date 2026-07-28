import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#0056A6',
      light: '#EAF4FF',
      dark: '#004B91',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2563EB',
    },
    success: {
      main: '#16A34A',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#DC2626',
    },
    info: {
      main: '#2563EB',
    },
    background: {
      default: '#F6F8FB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Roboto", sans-serif',
    h1: {
      fontSize: '32px',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h2: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '14px',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '12px',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '14px',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 16px',
          fontWeight: 600,
          textTransform: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 86, 166, 0.15)',
          },
        },
        outlined: {
          borderColor: '#E5E7EB',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#FFFFFF',
          color: '#1F2937',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
        },
      },
    },
  },
});
