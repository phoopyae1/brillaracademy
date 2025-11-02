import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export const revalidate = 60;

export default async function HomePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F5F7FB',
        py: { xs: 6, md: 10 }
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={6}>
          <Stack spacing={3} textAlign={{ xs: 'center', md: 'left' }}>
            <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 2 }}>
              Welcome to Brillar Academy
            </Typography>
            <Typography variant="h2" fontWeight={800}>
              A modern platform for ambitious learners
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mx: { xs: 'auto', md: 0 } }}>
              Empower your teams with secure provisioning, insightful dashboards, and tools crafted for teachers, IT admins, and
              the Student Administrative Office.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={{ xs: 'center', md: 'flex-start' }}>
              <Button variant="contained" size="large" href="/login">
                Student login
              </Button>
              <Button variant="outlined" size="large" href="/admin/">
                Admin portal
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
