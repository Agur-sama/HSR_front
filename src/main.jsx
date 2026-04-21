import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import './index.css';
import { ProjectProvider } from './context/ProjectContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0B3A8D',
      light: '#2D6CDF',
      dark: '#062357',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2D6CDF',
      light: '#5B8FFF',
      dark: '#1F4A9D',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F3F7FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#10203A',
      secondary: '#4D5B78',
      disabled: '#8B96B3',
    },
    divider: '#D7E1EF',
    success: {
      main: '#4B8F63',
      light: '#6FA87F',
      dark: '#2D5C3F',
    },
    warning: {
      main: '#6A84AA',
      light: '#8B9FBF',
      dark: '#465278',
    },
    error: {
      main: '#B45B4E',
      light: '#C97566',
      dark: '#8C3D32',
    },
    info: {
      main: '#2D6CDF',
      light: '#5B8FFF',
      dark: '#1F4A9D',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: `'IBM Plex Sans', 'IBM Plex Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`,
    h1: {
      fontSize: '36px',
      fontWeight: 700,
      lineHeight: 1.1,
      color: '#10203A',
    },
    h2: {
      fontSize: '22px',
      fontWeight: 600,
      color: '#10203A',
    },
    h3: {
      fontSize: '18px',
      fontWeight: 600,
    },
    body1: {
      fontSize: '16px',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '14px',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '13px',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 24px rgba(11, 58, 141, 0.15)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 30px rgba(31, 45, 61, 0.08)',
          borderRadius: '18px',
          border: '1px solid #DBE3EE',
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '13px',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: '#ECF2FA',
        },
        bar: {
          borderRadius: 3,
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProjectProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProjectProvider>
    </ThemeProvider>
  </React.StrictMode>
);