import { createTheme } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// Design tokens — identité "commerce intelligence"
// ---------------------------------------------------------------------------
export const tokens = {
  ink: '#0B1220',
  inkSoft: '#111A2E',
  surface: '#F7F8FA',
  paper: '#FFFFFF',
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#818CF8',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#F43F5E',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: 'rgba(15, 23, 42, 0.08)',
  gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  gradientText: 'linear-gradient(90deg, #818CF8 0%, #C4B5FD 100%)',
};

const fontStack = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'sans-serif',
].join(',');

const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.primary, dark: tokens.primaryDark, light: tokens.primaryLight },
    secondary: { main: tokens.amber },
    success: { main: tokens.emerald },
    error: { main: tokens.rose },
    background: { default: tokens.surface, paper: tokens.paper },
    text: { primary: tokens.textPrimary, secondary: tokens.textSecondary },
    divider: tokens.border,
  },

  shape: { borderRadius: 12 },

  typography: {
    fontFamily: fontStack,
    h1: { fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08 },
    h2: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12 },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 500 },
    body1: { lineHeight: 1.65 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    overline: { fontWeight: 700, letterSpacing: '0.12em' },
  },

  shadows: [
    'none',
    '0 1px 2px rgba(15, 23, 42, 0.05)',
    '0 1px 3px rgba(15, 23, 42, 0.07), 0 1px 2px rgba(15, 23, 42, 0.04)',
    '0 4px 12px rgba(15, 23, 42, 0.06)',
    '0 6px 16px rgba(15, 23, 42, 0.07)',
    '0 8px 24px rgba(15, 23, 42, 0.09)',
    '0 12px 32px rgba(15, 23, 42, 0.11)',
    '0 16px 40px rgba(15, 23, 42, 0.12)',
    '0 20px 48px rgba(15, 23, 42, 0.14)',
    ...Array(16).fill('0 24px 56px rgba(15, 23, 42, 0.16)'),
  ],

  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 20,
          paddingBlock: 10,
          transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
          '&:active': { transform: 'scale(0.98)' },
        },
        sizeLarge: { paddingInline: 28, paddingBlock: 13, fontSize: '1rem' },
        containedPrimary: {
          backgroundImage: tokens.gradient,
          boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
          '&:hover': {
            backgroundImage: tokens.gradient,
            boxShadow: '0 12px 28px rgba(99, 102, 241, 0.45)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: tokens.border,
          '&:hover': { borderColor: tokens.primary, backgroundColor: 'rgba(79, 70, 229, 0.04)' },
        },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${tokens.border}`,
          transition: 'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
        },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: tokens.border },
      },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: tokens.paper,
          transition: 'box-shadow 160ms ease',
          '&.Mui-focused': { boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.12)' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15, 23, 42, 0.2)' },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },

    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
    },
  },
});

export default muiTheme;
