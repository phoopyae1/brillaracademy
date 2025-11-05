import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import type { StudentDashboardData, FeePayment } from '@/lib/db';

type TimetableEntry = StudentDashboardData['timetable'][0];
type ClassRegistration = StudentDashboardData['registrations'][0];

const CREDIT_RATE = 100;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

interface CoursesTabProps {
  registrations: ClassRegistration[];
  timetable: TimetableEntry[];
  fees: FeePayment[];
}

export default function CoursesTab({ registrations, timetable, fees }: CoursesTabProps) {
  const registeredCourses = registrations.filter((registration) => registration.status === 'registered');
  const totalCredits = registeredCourses.reduce((sum, reg) => sum + (reg.credits ?? 0), 0);
  const totalTuition = totalCredits * CREDIT_RATE;

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedTimetable = [...timetable].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.weekday) - dayOrder.indexOf(b.weekday);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const getFeeStatus = (subject: string) => {
    const fee = fees.find(f => f.description?.includes(subject));
    return fee ? fee.status : null;
  };

  return (
    <Stack spacing={3}>
      {/* Summary Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(63, 136, 197, 0.2)'
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <MenuBookRoundedIcon color="primary" />
                <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                  Total Courses
                </Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700}>
                {registeredCourses.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalCredits} credits registered
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(63, 136, 197, 0.2)'
            }}
          >
            <Stack spacing={2}>
              <Typography variant="subtitle2" fontWeight={600} color="info.main">
                Total Credits
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {totalCredits}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Credit limit: 21
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(63, 136, 197, 0.2)'
            }}
          >
            <Stack spacing={2}>
              <Typography variant="subtitle2" fontWeight={600} color="secondary.main">
                Estimated Tuition
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {formatCurrency(totalTuition)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(CREDIT_RATE)} per credit
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Course Registrations Table */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            My Courses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete list of all registered courses with details and status.
          </Typography>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Course Name</TableCell>
                  <TableCell>Instructor</TableCell>
                  <TableCell>Credits</TableCell>
                  <TableCell>Tuition</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Confirmed</TableCell>
                  <TableCell>Registered Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registrations.map((registration) => {
                  const credits = registration.credits ?? 0;
                  const tuition = credits > 0 ? formatCurrency(credits * CREDIT_RATE) : '—';

                  return (
                    <TableRow key={registration.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{registration.className}</TableCell>
                      <TableCell>{registration.instructor ?? 'TBA'}</TableCell>
                      <TableCell>{credits || '—'}</TableCell>
                      <TableCell>{tuition}</TableCell>
                      <TableCell>
                        <Chip
                          label={registration.status}
                          color={
                            registration.status === 'registered'
                              ? 'success'
                              : registration.status === 'waitlisted'
                                ? 'warning'
                                : 'default'
                          }
                          size="small"
                          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        {registration.confirmedBy ? (
                          <Chip
                            label="Confirmed"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            label="Pending"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(registration.registeredAt)}</TableCell>
                    </TableRow>
                  );
                })}
                {!registrations.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No courses registered yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>

      {/* Course Schedule */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            Course Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Weekly timetable for all your registered courses.
          </Typography>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Payment Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTimetable.map((entry) => {
                  const feeStatus = getFeeStatus(entry.subject);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{entry.weekday}</TableCell>
                      <TableCell>
                        {entry.startTime} – {entry.endTime}
                      </TableCell>
                      <TableCell>{entry.subject}</TableCell>
                      <TableCell>{entry.location ?? 'TBA'}</TableCell>
                      <TableCell>
                        {feeStatus ? (
                          <Chip
                            label={feeStatus === 'paid' ? 'Paid' : 'Pending'}
                            size="small"
                            color={feeStatus === 'paid' ? 'success' : 'warning'}
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!sortedTimetable.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No schedule entries yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>
    </Stack>
  );
}
