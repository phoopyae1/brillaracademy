import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchStudentDashboard } from '@/lib/db';

export const metadata = {
  title: 'Student Dashboard | Brillar Academy',
  description: 'Review your personal timetable, upcoming milestones, and active class registrations.'
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default async function DashboardPage() {
  const cookieStore = cookies();
  const studentIdCookie = cookieStore.get('brillar_student_id');
  const parsedId = Number(studentIdCookie?.value);

  if (!studentIdCookie || !Number.isFinite(parsedId)) {
    redirect('/login');
  }

  const dashboard = await fetchStudentDashboard(parsedId);

  if (!dashboard) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F5F7FB 0%, #FFFFFF 100%)', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: { xs: 4, md: 6 }, textAlign: 'center' }}>
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

  const {
    student,
    timetable,
    schedule,
    registrations,
    grades,
    upcomingExams,
    gpaBySemester,
    registrationWindows,
    fees
  } = dashboard;

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedTimetable = [...timetable].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.weekday) - dayOrder.indexOf(b.weekday);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const upcomingExamList = upcomingExams.slice(0, 3);
  const outstandingFees = fees.filter((fee) => fee.status !== 'paid');
  const gpaHighlights = gpaBySemester.slice(0, 3);
  const nextRegistrationWindow = registrationWindows.find((window) => window.status === 'open') ?? registrationWindows[0];

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #ECF4FF 0%, #F6FBFF 100%)', py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Stack spacing={5}>
          <Stack spacing={1} textAlign={{ xs: 'center', md: 'left' }}>
            <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 2 }}>
              Student dashboard
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              Hello {student.firstName}!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620, mx: { xs: 'auto', md: 0 } }}>
              Review your live timetable, stay aligned with upcoming sessions, and confirm the classes you are currently registered for.
            </Typography>
          </Stack>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: 3, height: '100%' }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    GPA snapshots
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {gpaHighlights.map((item) => (
                      <Chip key={item.id} label={`${item.semester}: ${item.gpa.toFixed(2)}`} color="primary" variant="outlined" />
                    ))}
                    {!gpaHighlights.length && <Typography variant="body2">No GPA records yet.</Typography>}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: 3, height: '100%' }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Upcoming exams
                  </Typography>
                  <Stack spacing={1.5}>
                    {upcomingExamList.map((exam) => (
                      <Stack key={exam.id} spacing={0.5}>
                        <Typography fontWeight={600}>{exam.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(exam.examDate)}
                        </Typography>
                      </Stack>
                    ))}
                    {!upcomingExamList.length && <Typography variant="body2">No upcoming exams posted.</Typography>}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: 3, height: '100%' }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Financial reminders
                  </Typography>
                  <Stack spacing={1.5}>
                    {outstandingFees.map((fee) => (
                      <Stack key={fee.id} spacing={0.5}>
                        <Typography fontWeight={600}>{formatCurrency(fee.amount)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fee.description ?? 'Tuition or fee'} · Due {fee.dueDate ? formatDateTime(fee.dueDate) : 'soon'}
                        </Typography>
                      </Stack>
                    ))}
                    {!outstandingFees.length && <Typography variant="body2">All fees are up to date.</Typography>}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ borderRadius: 4, p: { xs: 3, md: 4 }, height: '100%' }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Weekly timetable
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Track where you need to be and when across the academy.
                    </Typography>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed' }} />

                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Day</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedTimetable.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{entry.weekday}</TableCell>
                          <TableCell>
                            {entry.startTime} – {entry.endTime}
                          </TableCell>
                          <TableCell>{entry.subject}</TableCell>
                          <TableCell>{entry.location ?? 'TBA'}</TableCell>
                        </TableRow>
                      ))}
                      {!sortedTimetable.length && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            No sessions scheduled yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={3} sx={{ borderRadius: 4, p: { xs: 3, md: 4 }, height: '100%' }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Upcoming schedule
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Stay prepared with advisor meetings, workshops, and mentorship touchpoints.
                    </Typography>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed' }} />

                  <Stack spacing={2}>
                    {schedule.map((item) => (
                      <Paper key={item.id} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateTime(item.startTime)} – {formatDateTime(item.endTime)}
                          </Typography>
                          {item.description && (
                            <Typography variant="body2" color="text.secondary">
                              {item.description}
                            </Typography>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                    {!schedule.length && (
                      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No upcoming events yet. Once you add schedule items, they will appear here.
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Paper elevation={3} sx={{ borderRadius: 4, p: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Class registrations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confirm your enrolled classes, instructors, and registration status in one place.
                </Typography>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Class</TableCell>
                    <TableCell>Instructor</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Registered</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{registration.className}</TableCell>
                      <TableCell>{registration.instructor ?? 'TBA'}</TableCell>
                      <TableCell>
                        <Chip
                          label={registration.status}
                          color={registration.status === 'registered' ? 'success' : registration.status === 'waitlisted' ? 'warning' : 'default'}
                          size="small"
                          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(registration.registeredAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!registrations.length && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No class registrations have been submitted yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Stack>
          </Paper>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 }, height: '100%' }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Grade summary
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Course</TableCell>
                        <TableCell>Semester</TableCell>
                        <TableCell>Grade</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={600}>{grade.courseTitle}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {grade.courseCode}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{grade.semester}</TableCell>
                          <TableCell>{grade.grade}</TableCell>
                        </TableRow>
                      ))}
                      {!grades.length && (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No grades published yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 }, height: '100%' }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Registration windows
                  </Typography>
                  {nextRegistrationWindow ? (
                    <Stack spacing={1}>
                      <Typography fontWeight={600}>{nextRegistrationWindow.semester}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status: {nextRegistrationWindow.status.toUpperCase()} · Opens {formatDateTime(nextRegistrationWindow.opensAt)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Closes {formatDateTime(nextRegistrationWindow.closesAt)}
                      </Typography>
                      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
                      <Stack spacing={1}>
                        {nextRegistrationWindow.courses.map((course) => (
                          <Stack key={course.courseCode} spacing={0.25}>
                            <Typography fontWeight={600}>{course.courseTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {course.courseCode} · {course.instructor} · {course.credits} credits
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Registration windows will appear here as soon as they are announced.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
