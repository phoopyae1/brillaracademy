import Chip from '@mui/material/Chip';
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
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import type { StudentDashboardData, SemesterRegistration } from '@/lib/db';

type ScheduleEntry = StudentDashboardData['schedule'][0];
type RegistrationWindow = SemesterRegistration;
type TimetableEntry = StudentDashboardData['timetable'][0];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore'
  }).format(new Date(value));
}

interface PlanningTabProps {
  schedule: ScheduleEntry[];
  registrationWindows: RegistrationWindow[];
  timetable: TimetableEntry[];
}

export default function PlanningTab({ schedule, registrationWindows, timetable }: PlanningTabProps) {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedTimetable = [...timetable].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.weekday) - dayOrder.indexOf(b.weekday);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const upcomingEvents = schedule.filter(
    (item) => new Date(item.startTime) >= new Date()
  ).slice(0, 10);

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
                <ScheduleRoundedIcon color="primary" />
                <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                  Upcoming Events
                </Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700}>
                {schedule.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Events scheduled for this term
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
              border: '1px solid rgba(56,189,248,0.2)'
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <EventNoteRoundedIcon color="info" />
                <Typography variant="subtitle2" fontWeight={600} color="info.main">
                  Registration Windows
                </Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700}>
                {registrationWindows.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available registration periods
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
              border: '1px solid rgba(244,114,182,0.18)'
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CalendarTodayRoundedIcon color="secondary" />
                <Typography variant="subtitle2" fontWeight={600} color="secondary.main">
                  Weekly Classes
                </Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700}>
                {sortedTimetable.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scheduled classes per week
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Registration Windows */}
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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Registration Windows
            </Typography>
            <Chip
              icon={<EventNoteRoundedIcon fontSize="small" />}
              label={`${registrationWindows.length} window${registrationWindows.length === 1 ? '' : 's'}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Plan your course registration during these available periods.
          </Typography>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <Stack spacing={3}>
            {registrationWindows.map((window) => (
              <Stack key={window.id} spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack spacing={0.5}>
                    <Typography variant="h6" fontWeight={600}>
                      {window.semester}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Opens: {formatDateTime(window.opensAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Closes: {formatDateTime(window.closesAt)}
                    </Typography>
                  </Stack>
                  <Chip
                    label={window.status.toUpperCase()}
                    size="small"
                    color={window.status === 'open' ? 'success' : 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                {window.courses.length > 0 && (
                  <>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Available Courses:
                    </Typography>
                    <Grid container spacing={2}>
                      {window.courses.map((course) => (
                        <Grid item xs={12} sm={6} md={4} key={course.courseCode}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              backgroundColor: 'rgba(63, 136, 197, 0.06)',
                              borderColor: 'rgba(63, 136, 197, 0.2)'
                            }}
                          >
                            <Stack spacing={1}>
                              <Typography variant="body1" fontWeight={600}>
                                {course.courseTitle}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {course.courseCode}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Instructor: {course.instructor}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Credits: {course.credits}
                              </Typography>
                            </Stack>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
                {registrationWindows.indexOf(window) < registrationWindows.length - 1 && (
                  <Divider sx={{ my: 2 }} />
                )}
              </Stack>
            ))}
            {!registrationWindows.length && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No registration windows available at this time.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Upcoming Events */}
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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Upcoming Events & Meetings
            </Typography>
            <Chip
              icon={<ScheduleRoundedIcon fontSize="small" />}
              label={`${upcomingEvents.length} upcoming`}
              size="small"
              color="info"
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Stay prepared for advisor meetings, workshops, and mentorship touchpoints.
          </Typography>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upcomingEvents.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                    <TableCell>{formatDateTime(item.startTime)}</TableCell>
                    <TableCell>{formatDateTime(item.endTime)}</TableCell>
                    <TableCell>
                      <Chip label="Event" size="small" color="primary" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
                {!upcomingEvents.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No upcoming events scheduled.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>

      {/* Weekly Schedule */}
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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Weekly Class Schedule
            </Typography>
            <Chip
              icon={<CalendarTodayRoundedIcon fontSize="small" />}
              label="This week"
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Plan your week with this complete schedule of all classes.
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
                      No classes scheduled yet.
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
