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
  

        <StudentPortalSection />

        <Divider sx={{ my: { xs: 4, md: 6 } }} />

      </Container>
    </Box>
  );
}
