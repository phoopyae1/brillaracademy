import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Container from '@mui/material/Container';
import { redirect } from 'next/navigation';
import { fetchStudentDashboard, listAvailableClassrooms } from '@/lib/db';
import StudentDashboard from '@/components/student/StudentDashboard';

type StudentPortalPageProps = {
  studentId: number;
};

export default async function StudentPortalPage({ studentId }: StudentPortalPageProps) {
  if (!Number.isFinite(studentId)) {
    redirect('/login');
  }

  const dashboard = await fetchStudentDashboard(studentId);

  if (!dashboard) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#F5F7FB', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              We could not find that dashboard
            </Typography>
            <Typography color="text.secondary">
              Try registering for an account first, then return here using the dashboard link provided after signing in.
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  const availableClassrooms = await listAvailableClassrooms(dashboard.student.id);

  return (
    <StudentDashboard
      dashboard={dashboard}
      availableClassrooms={availableClassrooms}
      classroomEnrollments={dashboard.classroomEnrollments}
    />
                              );
}