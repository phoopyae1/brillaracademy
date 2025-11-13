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
    timeStyle: 'short',
    timeZone: 'Asia/Singapore'
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

  return (
    <Stack spacing={3}>
      {/* Summary Statistics */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {registeredCourses.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active courses
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {totalCredits}/{creditLimit} credits · {formatCurrency(tuitionEstimate)} estimated
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {schedule.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming events
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {schedule.length ? 'Review agenda below' : 'No events scheduled'}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {formatCurrency(totalOutstanding)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Outstanding balance
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {outstandingFees.length > 0
                  ? `${outstandingFees.length} fee${outstandingFees.length > 1 ? 's' : ''} pending`
                  : 'All fees paid'}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* Weekly Timetable */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Weekly timetable
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track locations and course sessions for the coming week.
                  </Typography>
                </Box>
                <Divider />
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Day</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedTimetable.map((entry) => {
                        return (
                          <TableRow key={entry.id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{entry.weekday}</TableCell>
                            <TableCell>
                              <Typography variant="body2">{entry.startTime} – {entry.endTime}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{entry.subject}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {entry.location ?? 'TBA'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!sortedTimetable.length && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            <Typography variant="body2">No sessions scheduled yet.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </Paper>

            {/* Registration Windows */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Registration windows
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View available registration periods and course offerings.
                  </Typography>
                </Box>
                <Divider />
                {nextRegistrationWindow ? (
                  <Stack spacing={2}>
                    <Box>
                      <Typography fontWeight={600} variant="body1" gutterBottom>
                        {nextRegistrationWindow.semester}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          label={nextRegistrationWindow.status.toUpperCase()}
                          size="small"
                          color={nextRegistrationWindow.status === 'open' ? 'success' : 'default'}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Opens {formatDateTime(nextRegistrationWindow.opensAt)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Closes {formatDateTime(nextRegistrationWindow.closesAt)}
                      </Typography>
                    </Box>
                    {nextRegistrationWindow.courses.length > 0 && (
                      <>
                        <Divider />
                        <Stack spacing={1.5}>
                          {nextRegistrationWindow.courses.map((course) => (
                            <Box key={course.courseCode}>
                              <Typography fontWeight={600} variant="body2">
                                {course.courseTitle}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {course.courseCode} · {course.instructor} · {course.credits} credits
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </>
                    )}
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

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Upcoming Exams */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Upcoming exams
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review your upcoming assessments and exam dates.
                  </Typography>
                </Box>
                <Divider />
                {upcomingExamList.length > 0 ? (
                  <Stack spacing={2}>
                    {upcomingExamList.map((exam) => (
                      <Box key={exam.id}>
                        <Typography fontWeight={600} variant="body2">
                          {exam.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(exam.examDate)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No upcoming exams posted.
                  </Typography>
                )}
              </Stack>
            </Paper>

            {/* Upcoming Schedule */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Upcoming schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Stay prepared for advisor meetings, workshops, and mentorship touchpoints.
                  </Typography>
                </Box>
                <Divider />
                {scheduleHighlights.length > 0 ? (
                  <Stack spacing={2}>
                    {scheduleHighlights.map((item) => (
                      <Box key={item.id}>
                        <Typography fontWeight={600} variant="body2">
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(item.startTime)} – {formatDateTime(item.endTime)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No upcoming events yet.
                  </Typography>
                )}
              </Stack>
            </Paper>

            {/* GPA Snapshots */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    GPA snapshots
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track your academic performance by semester.
                  </Typography>
                </Box>
                <Divider />
                {gpaHighlights.length > 0 ? (
                  <Stack spacing={1.5}>
                    {gpaHighlights.map((item) => (
                      <Box key={item.id}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={500}>
                            {item.semester}
                          </Typography>
                          <Chip
                            label={item.gpa.toFixed(2)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                    ))}
                    {averageGpa !== null && (
                      <>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            Overall GPA
                          </Typography>
                          <Typography variant="body1" fontWeight={700} color="primary.main">
                            {averageGpa.toFixed(2)}
                          </Typography>
                        </Stack>
                      </>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No GPA records yet.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Class Registrations and Grades */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Class registrations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confirm your enrolled classes, instructors, and registration status in one place.
                </Typography>
              </Box>
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Instructor</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Credits</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tuition</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Confirmed</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Registered</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrations.map((registration) => {
                      const credits = registration.credits ?? 0;
                      const tuition = credits > 0 ? formatCurrency(credits * CREDIT_RATE) : '—';

                      return (
                        <TableRow key={registration.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {registration.className}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{registration.instructor ?? 'TBA'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{credits || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{tuition}</Typography>
                          </TableCell>
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
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell>
                            {registration.confirmedBy ? (
                              <Chip label="Confirmed" size="small" color="success" variant="outlined" />
                            ) : (
                              <Chip label="Pending" size="small" color="warning" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateTime(registration.registeredAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!registrations.length && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          <Typography variant="body2">No class registrations have been submitted yet.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            {/* Grade Summary */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Grade summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review your latest grades and academic performance.
                  </Typography>
                </Box>
                <Divider />
                {gradeHighlights.length > 0 ? (
                  <Stack spacing={2}>
                    {gradeHighlights.map((grade) => (
                      <Box key={grade.id}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography fontWeight={600} variant="body2">
                              {grade.courseTitle}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {grade.courseCode} · {grade.semester}
                            </Typography>
                          </Box>
                          <Chip label={grade.grade} size="small" color="primary" variant="outlined" />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No grades published yet.
                  </Typography>
                )}
              </Stack>
            </Paper>

            {/* Class Fees & Payments */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Class fees & payments
                    </Typography>
                    {outstandingFees.length > 0 && (
                      <Chip
                        label={`${outstandingFees.length} pending`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Outstanding fees requiring payment. Paid fees are not shown.
                  </Typography>
                </Box>
                <Divider />
                {outstandingFees.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {outstandingFees.map((fee) => (
                          <TableRow key={fee.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {fee.description ?? 'Fee'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{formatCurrency(fee.amount)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {fee.dueDate ? formatDateTime(fee.dueDate) : 'TBA'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label="Pending" size="small" color="warning" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      All fees have been paid. No outstanding balance.
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>


      {/* Classroom Registration */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
        <ClassroomSelfRegistrationCard
          studentId={student.id}
          classrooms={availableClassrooms}
          enrollments={classroomEnrollments}
          studentMajor={student.primaryInterest}
        />
      </Paper>
    </Stack>
  );
}
