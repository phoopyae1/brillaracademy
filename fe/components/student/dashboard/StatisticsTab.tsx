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
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import type { StudentDashboardData, GradeRecord, SemesterGpa } from '@/lib/db';

type Grade = GradeRecord;
type GPABySemester = SemesterGpa;
type ClassRegistration = StudentDashboardData['registrations'][0];

const GPA_MAX = 3;
const GPA_THRESHOLD_EXCELLENT = Math.round(3.5 * (GPA_MAX / 4) * 100) / 100;
const GPA_THRESHOLD_GOOD = Math.round(3.0 * (GPA_MAX / 4) * 100) / 100;
const GPA_THRESHOLD_FAIR = Math.round(2.5 * (GPA_MAX / 4) * 100) / 100;

interface StatisticsTabProps {
  currentSemester?: string;
  grades: Grade[];
  gpaBySemester: GPABySemester[];
  registrations: ClassRegistration[];
}

export default function StatisticsTab({ grades, gpaBySemester, registrations }: StatisticsTabProps) {
  const registeredCourses = registrations.filter((registration) => registration.status === 'registered');
  const totalCredits = registeredCourses.reduce((sum, reg) => sum + (reg.credits ?? 0), 0);

  const averageGpa = gpaBySemester.length
    ? gpaBySemester.reduce((sum, entry) => sum + entry.gpa, 0) / gpaBySemester.length
    : null;

  const gradeDistribution = grades.reduce(
    (acc, grade) => {
      const letter = grade.grade;
      acc[letter] = (acc[letter] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedGpa = [...gpaBySemester].sort((a, b) => {
    const semesterA = a.semester.split('/');
    const semesterB = b.semester.split('/');
    const yearA = parseInt(semesterA[1] || '0');
    const yearB = parseInt(semesterB[1] || '0');
    const termA = parseInt(semesterA[0] || '0');
    const termB = parseInt(semesterB[0] || '0');
    if (yearA !== yearB) return yearB - yearA;
    return termB - termA;
  });

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
                <TrendingUpRoundedIcon color="primary" />
                <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                  Overall GPA
                </Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700}>
                {averageGpa !== null ? averageGpa.toFixed(2) : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {gpaBySemester.length} semester{gpaBySemester.length === 1 ? '' : 's'} recorded
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
                <AssessmentRoundedIcon color="info" />
                <Typography variant="subtitle2" fontWeight={600} color="info.main">
                  Total Courses
                </Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700}>
                {grades.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Courses with grades published
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
                <SchoolRoundedIcon color="secondary" />
                <Typography variant="subtitle2" fontWeight={600} color="secondary.main">
                  Credits Completed
                </Typography>
              </Stack>
              <Typography variant="h3" fontWeight={700}>
                {totalCredits}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total credits registered
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* GPA by Semester */}
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
            GPA by Semester
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your academic performance across all semesters.
          </Typography>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Semester</TableCell>
                  <TableCell align="right">GPA</TableCell>
                  <TableCell>Performance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedGpa.map((item) => {
                  const performance =
                    item.gpa >= GPA_THRESHOLD_EXCELLENT
                      ? 'Excellent'
                      : item.gpa >= GPA_THRESHOLD_GOOD
                        ? 'Good'
                        : item.gpa >= GPA_THRESHOLD_FAIR
                          ? 'Fair'
                          : 'Needs Improvement';
                  const color =
                    item.gpa >= GPA_THRESHOLD_EXCELLENT
                      ? 'success'
                      : item.gpa >= GPA_THRESHOLD_GOOD
                        ? 'primary'
                        : item.gpa >= GPA_THRESHOLD_FAIR
                          ? 'warning'
                          : 'error';

                  return (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.semester}</TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" fontWeight={700}>
                          {item.gpa.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={performance} size="small" color={color} sx={{ fontWeight: 600 }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!sortedGpa.length && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No GPA records available yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>

      {/* Grade Distribution */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
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
                Grade Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Breakdown of your grades across all courses.
              </Typography>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack spacing={2}>
                {Object.entries(gradeDistribution)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([grade, count]) => (
                    <Stack key={grade} direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 60,
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '1.2rem',
                          color: 'primary.main'
                        }}
                      >
                        {grade}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box
                          sx={{
                            height: 24,
                            backgroundColor: 'rgba(63, 136, 197, 0.1)',
                            borderRadius: 1,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${(count / grades.length) * 100}%`,
                              backgroundColor: '#3F88C5',
                              borderRadius: 1,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right' }}>
                        {count}
                      </Typography>
                    </Stack>
                  ))}
                {Object.keys(gradeDistribution).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No grade distribution available yet.
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
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
                All Grades
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete list of all your course grades.
              </Typography>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Course</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Semester</TableCell>
                      <TableCell align="right">Grade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grades
                      .sort((a, b) => {
                        const semesterA = a.semester.split('/');
                        const semesterB = b.semester.split('/');
                        const yearA = parseInt(semesterA[1] || '0');
                        const yearB = parseInt(semesterB[1] || '0');
                        const termA = parseInt(semesterA[0] || '0');
                        const termB = parseInt(semesterB[0] || '0');
                        if (yearA !== yearB) return yearB - yearA;
                        if (termA !== termB) return termB - termA;
                        return a.courseCode.localeCompare(b.courseCode);
                      })
                      .map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{grade.courseTitle}</TableCell>
                          <TableCell>{grade.courseCode}</TableCell>
                          <TableCell>{grade.semester}</TableCell>
                          <TableCell align="right">
                            <Chip label={grade.grade} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    {!grades.length && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No grades available yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
