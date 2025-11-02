import { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Student Dashboard', href: '/dashboard' },
  { label: 'Forge Staff Portal', href: '/forge' },
  { label: 'Provisioning Suite', href: '/admin' },
  { label: 'Login', href: '/login' }
];

const highlightTags = [
  'Role-based dashboards',
  'Secure staff authentication',
  'Teacher scheduling',
  'Finance oversight',
  'Student self-service'
];

type PortalChromeProps = {
  children: ReactNode;
};

export default function PortalChrome({ children }: PortalChromeProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #F4F7FB 0%, #FFFFFF 35%, #F7FAFF 100%)'
      }}
    >
      <AppBar position="sticky" color="inherit" elevation={1} sx={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: { xs: 1.5, md: 3 }, py: 1.5 }}>
            <Typography
              component={Link}
              href="/"
              variant="h6"
              sx={{
                textDecoration: 'none',
                fontWeight: 800,
                color: 'primary.main',
                letterSpacing: 0.5
              }}
            >
              Brillar Academy Portal
            </Typography>
            <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
              {navLinks.map((item) => (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  color="primary"
                  variant="text"
                  sx={{ fontWeight: 600, textTransform: 'none' }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="section" sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5 }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {highlightTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                color="primary"
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  fontWeight: 600,
                  bgcolor: 'rgba(33, 150, 243, 0.08)'
                }}
              />
            ))}
          </Stack>
        </Container>
      </Box>

      <Box component="main" sx={{ flexGrow: 1 }}>{children}</Box>

      <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 3 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Brillar Academy. All rights reserved.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Built for modern campus operations.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
