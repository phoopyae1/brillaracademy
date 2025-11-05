'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3F88C5', // Professional blue (from Zendenta design)
      light: '#E0F2F7', // Light blue accent
      dark: '#2C5F7A',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#6F42C1', // Purple for status indicators
      light: '#E0CFFC',
      dark: '#5A32A3',
      contrastText: '#FFFFFF'
    },
    info: {
      main: '#3F88C5', // Match primary blue
      light: '#E0F2F7',
      dark: '#2C5F7A',
      contrastText: '#FFFFFF'
    },
    success: {
      main: '#28A745', // Green for success states
      light: '#D4EDDA',
      dark: '#1E7E34',
      contrastText: '#FFFFFF'
    },
    warning: {
      main: '#FFC107', // Orange for warnings
      light: '#FFF3CD',
      dark: '#E0A800',
      contrastText: '#000000'
    },
    error: {
      main: '#DC3545', // Red for errors
      light: '#F8D7DA',
      dark: '#C82333',
      contrastText: '#FFFFFF'
    },
    background: {
      default: '#F5F7FB', // Light gray-blue page background
      paper: '#FFFFFF'
    },
    text: {
      primary: '#4A5568', // Dark gray for primary text
      secondary: '#6B7280' // Medium gray for secondary text
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: {
      fontWeight: 700
    },
    h5: {
      fontWeight: 600
    },
    body1: {
      color: '#4A5568'
    }
  },
  shape: {
    borderRadius: 5
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      }
    }
  }
});

export default theme;
