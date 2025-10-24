import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

export const metadata = {
  title: 'Login | Brillar Academy',
  description: 'Access your Brillar Academy dashboard with a secure, student-focused login experience.'
};

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #EFF6FF 0%, #F6F8FB 100%)',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={12}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Welcome back 👋
              </Typography>
              <Typography color="text.secondary">
                Sign in to continue exploring curated lessons, assignments, and your personalized learning dashboard.
              </Typography>
            </Box>

            <Stack spacing={2.5} component="form" noValidate>
              <TextField label="Email address" type="email" fullWidth required autoComplete="email" />
              <TextField label="Password" type="password" fullWidth required autoComplete="current-password" />
              <Button variant="contained" color="primary" size="large" sx={{ py: 1.2 }}>
                Log in
              </Button>
            </Stack>

            <Divider>or</Divider>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Link href="/register" underline="hover">
                Need an account? Register here
              </Link>
              <Link href="/create" underline="hover">
                Interested in building a new class?
              </Link>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
