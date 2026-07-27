import { createTheme, Palette, PaletteOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';

const basePaletteLight: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#0a2540',
    light: '#1c3c66',
    dark: '#071a2e',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#0e7c3b',
    light: '#1aa254',
    dark: '#085828',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  error: {
    main: '#dc2626',
    light: '#ef4444',
    dark: '#991b1b',
  },
  info: {
    main: '#2563eb',
  },
  success: {
    main: '#0e7c3b',
  },
  background: {
    default: '#f5f7fa',
    paper: '#ffffff',
  },
  text: {
    primary: '#0b1220',
    secondary: '#475569',
  },
  divider: '#e5e7eb',
};

const basePaletteDark: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#4c92d9',
    light: '#74b0e7',
    dark: '#2a6fbe',
    contrastText: '#061225',
  },
  secondary: {
    main: '#34d399',
    light: '#6ee7b7',
    dark: '#10b981',
    contrastText: '#061225',
  },
  warning: { main: '#fbbf24' },
  error: { main: '#f87171' },
  info: { main: '#60a5fa' },
  success: { main: '#34d399' },
  background: {
    default: '#0b1220',
    paper: '#111a2e',
  },
  text: {
    primary: '#e5e7eb',
    secondary: '#94a3b8',
  },
  divider: '#1f2937',
};

export const buildTheme = (mode: 'light' | 'dark' = 'light') => {
  const palette = mode === 'light' ? basePaletteLight : basePaletteDark;
  const isLight = mode === 'light';

  return createTheme({
    palette,
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: [
        'Roboto',
        'Arial',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: { fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontSize: 22, fontWeight: 700 },
      h4: { fontSize: 18, fontWeight: 700 },
      h5: { fontSize: 16, fontWeight: 600 },
      h6: { fontSize: 14, fontWeight: 600 },
      subtitle1: { fontSize: 14, fontWeight: 500 },
      body1: { fontSize: 14 },
      body2: { fontSize: 13 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: palette.mode === 'light' ? '#0a2540' : '#0a1730',
            color: '#fff',
            backdropFilter: 'blur(8px)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: '16px',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          containedPrimary: {
            backgroundImage: isLight
              ? 'linear-gradient(135deg, #0a2540 0%, #1c3c66 100%)'
              : undefined,
          },
          containedSecondary: {
            backgroundImage: isLight
              ? 'linear-gradient(135deg, #0e7c3b 0%, #1aa254 100%)'
              : undefined,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isLight ? '1px solid rgba(17, 24, 39, 0.06)' : '1px solid rgba(255,255,255,0.06)',
            boxShadow: isLight
              ? '0 1px 3px rgba(17, 24, 39, 0.04), 0 1px 2px rgba(17,24,39,0.04)'
              : '0 1px 3px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 999,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 700, fontSize: 12, color: isLight ? '#334155' : '#cbd5e1' },
          body: { fontSize: 13 },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRightColor: isLight ? '#e5e7eb' : '#1f2937',
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: { color: isLight ? '#0a2540' : '#60a5fa', textDecoration: 'none' },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: { fontSize: 14 },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, height: 8 },
          bar: { borderRadius: 999 },
        },
      },
    },
  });
};
