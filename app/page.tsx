import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FeatureGrid from '@/components/FeatureGrid';
import StudentPortalSection from '@/components/StudentPortal';
import { fetchFeatures } from '@/lib/db';

export const revalidate = 60;

export default async function HomePage() {
  const features = await fetchFeatures();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #ECF4FF 0%, #F5F7FB 100%)',
        py: { xs: 6, md: 10 }
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={6} alignItems="center" textAlign="center" mb={4}>
          <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 2 }}>
            Brillar Academy Platform
          </Typography>
          <Typography variant="h2" component="h1" sx={{ maxWidth: 720 }}>
            A minimal, beautiful student experience built with Next.js, MUI, and PostgreSQL
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 640, color: 'text.secondary', fontWeight: 400 }}>
            Explore the thirteen essential pillars that power academic life — from authentication to advanced innovation.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" size="large" href="#features">
              Explore Features
            </Button>
            <Button variant="outlined" size="large" href="mailto:hello@brillar.academy">
              Talk to Us
            </Button>
          </Stack>
        </Stack>

        <StudentPortalSection />

        <Divider sx={{ my: { xs: 4, md: 6 } }} />

        <Stack spacing={3} id="features">
          <Stack spacing={1} textAlign={{ xs: 'center', md: 'left' }}>
            <Typography variant="h4">Thirteen pillars. One cohesive journey.</Typography>
            <Typography variant="body1" sx={{ maxWidth: 640, color: 'text.secondary' }}>
              Every capability is thoughtfully crafted to keep students focused, faculty empowered, and administrators informed.
            </Typography>
          </Stack>
          <FeatureGrid features={features} />
        </Stack>
      </Container>
    </Box>
  );
}
