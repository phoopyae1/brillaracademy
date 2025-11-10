import Box from '@mui/material/Box';
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
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import ClassroomSelfRegistrationCard from '@/components/student/ClassroomSelfRegistrationCard';
import type {
  Student,
  StudentDashboardData,
  GradeRecord,
  ExamAnnouncement,
  SemesterGpa,
  SemesterRegistration,
  FeePayment,
  ClassroomEnrollment,
  ClassroomAvailability,
  Integration
} from '@/lib/db';

type TimetableEntry = StudentDashboardData['timetable'][0];
type ScheduleEntry = StudentDashboardData['schedule'][0];
type ClassRegistration = StudentDashboardData['registrations'][0];
type Grade = GradeRecord;
type UpcomingExam = ExamAnnouncement;
type GPABySemester = SemesterGpa;
type RegistrationWindow = SemesterRegistration;

const CREDIT_RATE = 100;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value);
}

interface OverviewTabProps {
  student: Student;
  timetable: TimetableEntry[];
  schedule: ScheduleEntry[];
  registrations: ClassRegistration[];
  grades: Grade[];
  upcomingExams: UpcomingExam[];
  gpaBySemester: GPABySemester[];
  registrationWindows: RegistrationWindow[];
  fees: FeePayment[];
  classroomEnrollments: ClassroomEnrollment[];
  availableClassrooms: ClassroomAvailability[];
}

export default function OverviewTab({
  student,
  timetable,
  schedule,
  registrations,
  grades,
  upcomingExams,
  gpaBySemester,
  registrationWindows,
  fees,
  classroomEnrollments,
  availableClassrooms,
}: OverviewTabProps) {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedTimetable = [...timetable].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.weekday) - dayOrder.indexOf(b.weekday);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const registeredCourses = registrations.filter((registration) => registration.status === 'registered');
  const totalCredits = registeredCourses.reduce((sum, reg) => sum + (reg.credits ?? 0), 0);
  const creditLimit = 21;
  // Calculate total outstanding balance from all pending fees (excluding paid fees)
  const outstandingFees = fees.filter((fee) => fee.status !== 'paid');
  const totalOutstanding = outstandingFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
  const tuitionEstimate = totalCredits * CREDIT_RATE;
  const nextTimetableEntry = sortedTimetable[0];
  const upcomingExamList = upcomingExams.slice(0, 3);
  const nextExam = upcomingExamList[0];
  const scheduleHighlights = schedule.slice(0, 3);
  const gradeHighlights = grades.slice(0, 5);
  const gpaHighlights = gpaBySemester.slice(0, 3);
  const nextRegistrationWindow = registrationWindows.find((window) => window.status === 'open') ?? registrationWindows[0];
  const averageGpa = gpaBySemester.length
    ? gpaBySemester.reduce((sum, entry) => sum + entry.gpa, 0) / gpaBySemester.length
    : null;

  const getFeeStatus = (subject: string) => {
    const fee = fees.find(f => f.description?.includes(subject));
    return fee ? fee.status : null;
  };

  return (
    <>
      {/* Stats Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(63, 136, 197, 0.2)'
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
              border: '1px solid rgba(63, 136, 197, 0.2)'
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
              border: '1px solid rgba(63, 136, 197, 0.2)'
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
                {formatCurrency(totalOutstanding)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {outstandingFees.length > 0
                  ? `${outstandingFees.length} fee reminder${outstandingFees.length > 1 ? 's' : ''} awaiting payment.`
                  : 'All fees have been paid. Outstanding balance is S$0.00.'}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Weekly Timetable */}
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
                    Weekly timetable
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
                <Typography variant="h6" fontWeight={700}>
                  Registration windows
                </Typography>
                {nextRegistrationWindow ? (
                  <Stack spacing={1}>
                    <Typography fontWeight={600}>{nextRegistrationWindow.semester}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {nextRegistrationWindow.status.toUpperCase()} · Opens{' '}
                      {formatDateTime(nextRegistrationWindow.opensAt)}
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
            {/* Upcoming Exams */}
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
                    Upcoming exams
                  </Typography>
                  <Chip
                    icon={<TrendingUpRoundedIcon fontSize="small" />}
                    label="Assessments"
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
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

            {/* Upcoming Schedule */}
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
                    Upcoming schedule
                  </Typography>
                  <Chip
                    icon={<ScheduleRoundedIcon fontSize="small" />}
                    label={`${schedule.length} event${schedule.length === 1 ? '' : 's'}`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
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

            {/* GPA Snapshots */}
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
                  GPA snapshots
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {gpaHighlights.map((item) => (
                    <Chip
                      key={item.id}
                      label={`${item.semester}: ${item.gpa.toFixed(2)}`}
                      color="primary"
                      variant="outlined"
                    />
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

      {/* Class Registrations and Grades */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
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
            {/* Grade Summary */}
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

            {/* Class Fees & Payments */}
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
                    Class fees & payments
                  </Typography>
                  <Chip
                    icon={<AttachMoneyRoundedIcon fontSize="small" />}
                    label={`${outstandingFees.length} outstanding fee${outstandingFees.length === 1 ? '' : 's'}`}
                    size="small"
                    color={outstandingFees.length > 0 ? 'warning' : 'success'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Outstanding fees requiring payment. Paid fees are not shown.
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
                      {outstandingFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{fee.description ?? 'Fee'}</TableCell>
                          <TableCell>{formatCurrency(fee.amount)}</TableCell>
                          <TableCell>{fee.dueDate ? formatDateTime(fee.dueDate) : 'TBA'}</TableCell>
                          <TableCell>
                            <Chip
                              label="Pending"
                              size="small"
                              color="warning"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {!outstandingFees.length && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            All fees have been paid. No outstanding balance.
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


      {/* Classroom Registration */}
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
      {/* Widgets Section */}
      {/* {widgets.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            zIndex: 1000,
            width: { xs: '100%', md: '400px' },
            maxWidth: { xs: '100%', md: '400px' },
            height: { xs: '600px', md: '800px' },
            maxHeight: { xs: '600px', md: '800px' },
            overflow: 'hidden',
            isolation: 'isolate',
            pointerEvents: 'none',
            '& > *': {
              pointerEvents: 'auto',
            },
            '& iframe': {
              position: 'absolute !important',
              top: '0 !important',
              left: '0 !important',
              right: '0 !important',
              bottom: '0 !important',
              width: '100% !important',
              maxWidth: '100% !important',
              height: '100% !important',
              maxHeight: '100% !important',
              border: 'none !important',
              display: 'block !important',
              zIndex: '1 !important',
              pointerEvents: 'auto',
            },
          }}
          dangerouslySetInnerHTML={{ __html: widgets[0].iframe }}
        />
      )} */}

    </>
  );
}
