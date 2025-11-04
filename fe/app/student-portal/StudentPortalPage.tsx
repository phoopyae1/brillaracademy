import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchStudentDashboard, listAvailableClassrooms } from '@/lib/db';
import ClassroomSelfRegistrationCard from '@/components/student/ClassroomSelfRegistrationCard';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TableContainer from '@mui/material/TableContainer';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

const CREDIT_RATE = 4000;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
}


export default async function StudentPortalPage() {
  const cookieStore = cookies();
  const studentIdCookie = cookieStore.get('brillar_student_id');
  const parsedId = Number(studentIdCookie?.value);

  if (!studentIdCookie || !Number.isFinite(parsedId)) {
    redirect('/login');
  }

  const dashboard = await fetchStudentDashboard(parsedId);

  if (!dashboard) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#F5F7FB', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 4, md: 6 }, textAlign: 'center' }}>
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
    fees,
    classroomEnrollments
  } = dashboard;

  const availableClassrooms = await listAvailableClassrooms(student.id);

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

  const navItems = [
    { label: 'Overview', icon: <DashboardRoundedIcon fontSize="small" /> },
    { label: 'Courses', icon: <SchoolRoundedIcon fontSize="small" /> },
    { label: 'Planning', icon: <EventNoteRoundedIcon fontSize="small" /> },
    { label: 'Statistics', icon: <QueryStatsRoundedIcon fontSize="small" /> },
    { label: 'Messages', icon: <MailRoundedIcon fontSize="small" /> }
  ];

  const registeredCourses = registrations.filter((registration) => registration.status === 'registered');
  const totalCredits = registeredCourses.reduce((sum, reg) => sum + (reg.credits ?? 0), 0);
  const creditLimit = 21;
  const totalOutstanding = outstandingFees.reduce((sum, fee) => sum + fee.amount, 0);
  const tuitionEstimate = totalCredits * CREDIT_RATE;
  const nextTimetableEntry = sortedTimetable[0];
  const nextExam = upcomingExamList[0];
  const scheduleHighlights = schedule.slice(0, 3);
  const gradeHighlights = grades.slice(0, 5);
  const averageGpa = gpaBySemester.length
    ? gpaBySemester.reduce((sum, entry) => sum + entry.gpa, 0) / gpaBySemester.length
    : null;

  const avatarInitials = `${student.firstName.charAt(0)}${student.lastName ? student.lastName.charAt(0) : ''}`;

  // Helper function to get fee status for a subject
  const getFeeStatus = (subject: string) => {
    const fee = fees.find(f => f.description?.includes(subject));
    return fee ? fee.status : null;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F5F7FB',
        py: { xs: 5, md: 8 },
        px: { xs: 2, md: 3 }
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={3} lg={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                height: '100%',
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.6)',
              }}
            >
              <Stack spacing={4}>
                <Stack spacing={1.5}>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    Brillar Academy
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    Student Portal
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Navigate through your courses, plan your week, and monitor key milestones from a single dashboard.
                  </Typography>
                </Stack>

                <List disablePadding>
                  {navItems.map((item, index) => (
                    <ListItemButton
                      key={item.label}
                      selected={index === 0}
                      sx={{
                        mb: 1.5,
                        backgroundColor: index === 0 ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
                        '&.Mui-selected:hover': {
                          backgroundColor: 'rgba(99, 102, 241, 0.24)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ color: index === 0 ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontWeight: index === 0 ? 600 : 500, color: index === 0 ? 'primary.main' : 'text.primary' }}
                      />
                    </ListItemButton>
                  ))}
                </List>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    background: 'rgba(255, 255, 255, 0.98)',
                    borderColor: 'rgba(120, 113, 198, 0.3)'
                  }}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Need a hand?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contact your advisor for course adjustments or curriculum guidance at any time.
                    </Typography>
                    <Chip label="Advisor support" size="small" color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={9} lg={9}>
            <Stack spacing={4}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  background: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid rgba(255,255,255,0.7)',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                  <Stack spacing={1.5}>
                    <Chip label="Student dashboard" size="small" color="primary" sx={{ alignSelf: 'flex-start', fontWeight: 600 }} />
                    <Typography variant="h4" fontWeight={700}>
                      Hello {student.firstName} 👋
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460 }}>
                      Here’s a snapshot of your learning journey. Track schedules, assessments, and outstanding actions for the week.
                    </Typography>
                    {nextTimetableEntry && (
                      <Chip
                        icon={<ScheduleRoundedIcon fontSize="small" />}
                        label={`Next class: ${nextTimetableEntry.subject} · ${nextTimetableEntry.weekday} ${nextTimetableEntry.startTime}`}
                        sx={{
                          alignSelf: 'flex-start',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          color: 'primary.main',
                          fontWeight: 600
                        }}
                      />
                    )}
                  </Stack>

                  <Stack spacing={2} width={{ xs: '100%', md: 320 }}>
                    <TextField
                      fullWidth
                      placeholder="Search courses or tutors"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        sx: {
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          '& fieldset': { border: 'none' }
                        }
                      }}
                      size="small"
                    />
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                      <IconButton
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                        }}
                      >
                        <Badge color="error" variant="dot" overlap="circular">
                          <NotificationsRoundedIcon color="primary" />
                        </Badge>
                      </IconButton>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          width: 44,
                          height: 44,
                          fontWeight: 600
                        }}
                      >
                        {avatarInitials.toUpperCase()}
                      </Avatar>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid rgba(99,102,241,0.18)'
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <MenuBookRoundedIcon color="primary" />
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                          Active courses
                        </Typography>
                      </Stack>
                      <Typography variant="h3" fontWeight={700}>
                        {registeredCourses.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {totalCredits}/{creditLimit} credits registered
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estimated tuition: <Typography component="span" fontWeight={700}>{formatCurrency(tuitionEstimate)}</Typography>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        1 credit = {formatCurrency(CREDIT_RATE)} · {totalCredits} credit{totalCredits === 1 ? '' : 's'} confirmed
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {registrations.length} total registrations this term.
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid rgba(56,189,248,0.2)'
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <ScheduleRoundedIcon color="info" />
                        <Typography variant="subtitle2" fontWeight={600} color="info.main">
                          Upcoming events
                        </Typography>
                      </Stack>
                      <Typography variant="h3" fontWeight={700}>
                        {schedule.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {schedule.length ? 'Review the agenda below and stay prepared.' : 'No events scheduled just yet.'}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid rgba(244,114,182,0.18)'
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <AttachMoneyRoundedIcon color="secondary" />
                        <Typography variant="subtitle2" fontWeight={600} color="secondary.main">
                          Outstanding balance
                        </Typography>
                      </Stack>
                      <Typography variant="h3" fontWeight={700}>
                        {formatCurrency(totalOutstanding > 0 ? totalOutstanding : 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {outstandingFees.length
                          ? `${outstandingFees.length} fee reminder${outstandingFees.length > 1 ? 's' : ''} awaiting payment.`
                          : 'All payments are current. Great job!'}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Stack spacing={3}>
                    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700}>
                            Weekly timetable
                          </Typography>
                          <Chip icon={<CalendarTodayRoundedIcon fontSize="small" />} label="This week" size="small" color="primary" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Track locations and course sessions for the coming week.
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
                              <TableCell>Status</TableCell>
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
                                  No sessions scheduled yet.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                          </Table>
                        </TableContainer>
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
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
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Stack spacing={3}>
                    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700}>
                            Upcoming exams
                          </Typography>
                          <Chip icon={<TrendingUpRoundedIcon fontSize="small" />} label="Assessments" size="small" color="secondary" variant="outlined" />
                        </Stack>
                        <Stack spacing={1.5}>
                          {upcomingExamList.map((exam) => (
                            <Stack key={exam.id} spacing={0.75}>
                              <Typography fontWeight={600}>{exam.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(exam.examDate)}
                              </Typography>
                            </Stack>
                          ))}
                          {!upcomingExamList.length && <Typography variant="body2">No upcoming exams posted.</Typography>}
                        </Stack>
                        {nextExam && (
                          <Chip
                            icon={<CalendarTodayRoundedIcon fontSize="small" />}
                            label={`Next exam: ${formatDateTime(nextExam.examDate)}`}
                            size="small"
                            sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                          />
                        )}
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700}>
                            Upcoming schedule
                          </Typography>
                          <Chip icon={<ScheduleRoundedIcon fontSize="small" />} label={`${schedule.length} event${schedule.length === 1 ? '' : 's'}`} size="small" color="info" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Stay prepared for advisor meetings, workshops, and mentorship touchpoints.
                        </Typography>
                        <Stack spacing={1.5}>
                          {scheduleHighlights.map((item) => (
                            <Stack key={item.id} spacing={0.75}>
                              <Typography fontWeight={600}>{item.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(item.startTime)} – {formatDateTime(item.endTime)}
                              </Typography>
                            </Stack>
                          ))}
                          {!scheduleHighlights.length && <Typography variant="body2">No upcoming events yet.</Typography>}
                        </Stack>
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                      <Stack spacing={2}>
                        <Typography variant="h6" fontWeight={700}>
                          GPA snapshots
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {gpaHighlights.map((item) => (
                            <Chip key={item.id} label={`${item.semester}: ${item.gpa.toFixed(2)}`} color="primary" variant="outlined" />
                          ))}
                          {!gpaHighlights.length && <Typography variant="body2">No GPA records yet.</Typography>}
                        </Stack>
                        {averageGpa !== null && (
                          <Typography variant="body2" color="text.secondary">
                            Overall GPA to date: <Typography component="span" fontWeight={700}>{averageGpa.toFixed(2)}</Typography>
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Stack>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                    <Stack spacing={2}>
                      <Typography variant="h6" fontWeight={700}>
                        Class registrations
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Confirm your enrolled classes, instructors, and registration status in one place.
                      </Typography>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Class</TableCell>
                              <TableCell>Instructor</TableCell>
                              <TableCell>Credits</TableCell>
                              <TableCell>Tuition</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Confirmed</TableCell>
                              <TableCell>Registered</TableCell>
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
                                      color={registration.status === 'registered' ? 'success' : registration.status === 'waitlisted' ? 'warning' : 'default'}
                                      size="small"
                                      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {registration.confirmedBy ? (
                                      <Chip label="Confirmed" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                                    ) : (
                                      <Chip label="Pending" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                                    )}
                                  </TableCell>
                                  <TableCell>{formatDateTime(registration.registeredAt)}</TableCell>
                                </TableRow>
                              );
                            })}
                            {!registrations.length && (
                              <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                  No class registrations have been submitted yet.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Stack spacing={3}>
                    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                      <Stack spacing={2}>
                        <Typography variant="h6" fontWeight={700}>
                          Grade summary
                        </Typography>
                        <Stack spacing={1.5}>
                          {gradeHighlights.map((grade) => (
                            <Stack key={grade.id} direction="row" justifyContent="space-between" alignItems="center">
                              <Stack spacing={0.5}>
                                <Typography fontWeight={600}>{grade.courseTitle}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {grade.courseCode} · {grade.semester}
                                </Typography>
                              </Stack>
                              <Chip label={grade.grade} color="primary" variant="outlined" />
                            </Stack>
                          ))}
                          {!gradeHighlights.length && (
                            <Typography variant="body2" color="text.secondary">
                              No grades published yet.
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight={700}>
                            Class fees & payments
                          </Typography>
                          <Chip icon={<AttachMoneyRoundedIcon fontSize="small" />} label={`${fees.length} fee${fees.length === 1 ? '' : 's'}`} size="small" color="success" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Detailed fee breakdown for all registered classes.
                        </Typography>
                        <Divider sx={{ borderStyle: 'dashed' }} />
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Description</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Due Date</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {fees.map((fee) => (
                                <TableRow key={fee.id}>
                                  <TableCell sx={{ fontWeight: 600 }}>{fee.description ?? 'Fee'}</TableCell>
                                  <TableCell>{formatCurrency(fee.amount)}</TableCell>
                                  <TableCell>{fee.dueDate ? formatDateTime(fee.dueDate) : 'TBA'}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={fee.status === 'paid' ? 'Paid' : 'Pending'}
                                      size="small"
                                      color={fee.status === 'paid' ? 'success' : 'warning'}
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                              {!fees.length && (
                                <TableRow>
                                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No fees have been posted yet.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Stack>
                    </Paper>
                  </Stack>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <ClassroomSelfRegistrationCard
                    studentId={student.id}
                    classrooms={availableClassrooms}
                    enrollments={classroomEnrollments}
                    studentMajor={student.primaryInterest}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
