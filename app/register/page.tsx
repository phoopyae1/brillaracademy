import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';

export const metadata = {
  title: 'Register | Brillar Academy',
  description: 'Create your Brillar Academy account and unlock access to personalized academic pathways.'
};

export default function RegisterPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F0FFF4 0%, #F8F9FF 100%)',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={8}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Stack spacing={4}>
            <Box textAlign="center">
              <Typography variant="h3" fontWeight={700} gutterBottom>
                Join Brillar Academy 🌱
              </Typography>
              <Typography color="text.secondary">
                Tell us a bit about yourself to tailor courses, mentors, and collaborative programs to your goals.
              </Typography>
            </Box>

            <Stack spacing={3} component="form" noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="First name" required fullWidth autoComplete="given-name" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Last name" required fullWidth autoComplete="family-name" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Email address" type="email" required fullWidth autoComplete="email" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Create password" type="password" required fullWidth autoComplete="new-password" />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Role" placeholder="Student, Parent, or Mentor" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Primary interest" placeholder="STEM, Arts, Entrepreneurship..." fullWidth />
                </Grid>
              </Grid>

              <Divider light />

              <FormControlLabel
                control={<Checkbox required />}
                label={
                  <Typography variant="body2" color="text.secondary">
                    I agree to the{' '}
                    <Link href="#" underline="hover">
                      terms of service
                    </Link>{' '}
                    and acknowledge the privacy policy.
                  </Typography>
                }
              />

              <Button variant="contained" color="primary" size="large" sx={{ py: 1.3 }}>
                Create account
              </Button>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                Already have an account?{' '}
                <Link href="/login" underline="hover">
                  Log in here
                </Link>
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
