import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

import StudentSelfRegistrationForm from '@/components/student/StudentSelfRegistrationForm';
import { fetchMajorSubjectCatalog } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Student Self-Registration | Brillar Academy',
  description:
    'Create your Brillar Academy student account, choose your major, and pick the subjects that match your academic pathway.'
};

export default async function RegisterPage() {
  const majorCatalog = await fetchMajorSubjectCatalog();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F5F7FB',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.98)'
          }}
        >
          <Stack spacing={4}>
            <Stack spacing={1.5} textAlign="center">
              <Chip color="primary" label="Student onboarding" sx={{ alignSelf: 'center', fontWeight: 600 }} />
              <Typography variant="h3" fontWeight={700}>
                Join Brillar Academy in minutes
              </Typography>
              <Typography color="text.secondary">
                Create your secure account, select your major, and choose the subjects you want to study this term. You can
                always revisit the student portal to adjust your plan.
              </Typography>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <StudentSelfRegistrationForm majors={majorCatalog} />
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
