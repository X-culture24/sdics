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
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      '"Helvetica Neue"',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '32px',
      fontWeight: 600,
      lineHeight: 1.3,
      fontFamily: 'Inter, sans-serif',
    },
    h2: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.35,
      fontFamily: 'Inter, sans-serif',
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
      fontFamily: 'Inter, sans-serif',
    },
    h4: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.5,
      fontFamily: 'Inter, sans-serif',
    },
    h5: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: 1.5,
      fontFamily: 'Inter, sans-serif',
    },
    h6: {
      fontSize: '12px',
      fontWeight: 600,
      lineHeight: 1.5,
      fontFamily: 'Inter, sans-serif',
    },
    body1: {
      fontSize: '14px',
      lineHeight: 1.5,
      fontFamily: 'Inter, sans-serif',
    },
    body2: {
      fontSize: '12px',
      lineHeight: 1.5,
      fontFamily: 'Inter, sans-serif',
    },
    button: {
      fontSize: '14px',
      fontWeight: 600,
      textTransform: 'none',
      fontFamily: 'Inter, sans-serif',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        body: {
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        '*': {
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
    },
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
          fontFamily: 'Inter, sans-serif',
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
            fontFamily: 'Inter, sans-serif',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontFamily: 'Inter, sans-serif',
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
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: 'Inter, sans-serif',
        },
      },
    },
  },
});
