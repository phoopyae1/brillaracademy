"use client";

import React from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { SemesterGpa, GradeRecord } from '@/lib/db';

type GPABySemester = SemesterGpa;

interface GPATabProps {
  gpaBySemester: GPABySemester[];
  grades: GradeRecord[];
}

export default function GPATab({ gpaBySemester, grades }: GPATabProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const averageGpa = gpaBySemester.length
    ? gpaBySemester.reduce((sum, entry) => sum + entry.gpa, 0) / gpaBySemester.length
    : null;

  // Group grades by semester
  const gradesBySemester = React.useMemo(() => {
    const grouped = new Map<string, GradeRecord[]>();
    grades.forEach((grade) => {
      const semester = grade.semester;
      if (!grouped.has(semester)) {
        grouped.set(semester, []);
      }
      grouped.get(semester)!.push(grade);
    });
    return grouped;
  }, [grades]);

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Sort GPA by semester (most recent first)
  const sortedGpa = [...gpaBySemester].sort((a, b) => {
    // Parse semester format like "1/2026" or "2/2026"
    const parseSemester = (sem: string) => {
      const [term, year] = sem.split('/');
      return { term: Number(term), year: Number(year) };
    };
    const aSem = parseSemester(a.semester);
    const bSem = parseSemester(b.semester);
    if (aSem.year !== bSem.year) {
      return bSem.year - aSem.year;
    }
    return bSem.term - aSem.term;
  });

  // Calculate trend (comparing most recent to previous)
  const getTrend = () => {
    if (sortedGpa.length < 2) return null;
    const current = sortedGpa[0].gpa;
    const previous = sortedGpa[1].gpa;
    return {
      direction: current > previous ? 'up' : current < previous ? 'down' : 'stable',
      change: Math.abs(current - previous).toFixed(2),
      current,
      previous
    };
  };

  const trend = getTrend();

  // Get GPA color based on value
  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return 'success';
    if (gpa >= 3.0) return 'primary';
    if (gpa >= 2.5) return 'warning';
    return 'error';
  };

  // Get GPA label
  const getGPALabel = (gpa: number) => {
    if (gpa >= 3.5) return 'Excellent';
    if (gpa >= 3.0) return 'Good';
    if (gpa >= 2.5) return 'Fair';
    return 'Needs Improvement';
  };

  // Calculate progress percentage (assuming 4.0 scale)
  const getGPAProgress = (gpa: number) => {
    return (gpa / 4.0) * 100;
  };

  return (
    <Stack spacing={3}>
      {/* Overall GPA Card */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'rgba(63, 136, 197, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <SchoolRoundedIcon sx={{ fontSize: 32, color: '#3F88C5' }} />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Overall GPA
              </Typography>
              <Stack direction="row" spacing={2} alignItems="baseline">
                <Typography variant="h3" fontWeight={700} color="primary.main">
                  {averageGpa !== null ? averageGpa.toFixed(2) : 'N/A'}
                </Typography>
                {averageGpa !== null && (
                  <Chip
                    label={getGPALabel(averageGpa)}
                    size="small"
                    color={getGPAColor(averageGpa) as any}
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>
              {averageGpa !== null && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={getGPAProgress(averageGpa)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(63, 136, 197, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: averageGpa >= 3.5 ? '#4caf50' : averageGpa >= 3.0 ? '#3F88C5' : averageGpa >= 2.5 ? '#ff9800' : '#f44336'
                      }
                    }}
                  />
                </Box>
              )}
            </Box>
          </Stack>

          {trend && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: trend.direction === 'up' ? '#4caf50' : trend.direction === 'down' ? '#f44336' : 'text.secondary'
                }}
              >
                {trend.direction === 'up' && <TrendingUpIcon />}
                {trend.direction === 'down' && <TrendingDownIcon />}
                <Typography variant="body2" fontWeight={600}>
                  {trend.direction === 'up' ? 'Improved' : trend.direction === 'down' ? 'Decreased' : 'Stable'} by {trend.change} 
                  {' '}from {sortedGpa[1].semester} to {sortedGpa[0].semester}
                </Typography>
              </Box>
            </Stack>
          )}

          <Divider />

          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Semesters Recorded
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {gpaBySemester.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Current Semester
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {sortedGpa.length > 0 ? sortedGpa[0].semester : 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Highest GPA
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {sortedGpa.length > 0
                  ? `${Math.max(...sortedGpa.map((g) => g.gpa)).toFixed(2)} (${sortedGpa.find((g) => g.gpa === Math.max(...sortedGpa.map((g) => g.gpa)))?.semester})`
                  : 'N/A'}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {/* GPA by Semester Table */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              GPA by Semester
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track your academic performance across all semesters.
            </Typography>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }} width="50px"></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Semester</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Subjects</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>GPA</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedGpa.map((item) => {
                const statusLabel = getGPALabel(item.gpa);
                const statusColor = getGPAColor(item.gpa);
                const progress = getGPAProgress(item.gpa);
                const semesterGrades = gradesBySemester.get(item.semester) || [];
                const isExpanded = expandedRows.has(item.id);
                const subjectNames = semesterGrades.map(g => g.courseTitle).join(', ') || 'No courses';

                return (
                  <React.Fragment key={item.id}>
                    <TableRow hover>
                      <TableCell>
                        {semesterGrades.length > 0 && (
                          <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={() => toggleRow(item.id)}
                          >
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{item.semester}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                          {semesterGrades.length > 0 ? (
                            <Box component="span" sx={{ display: 'inline-block' }}>
                              {semesterGrades.slice(0, 2).map((g, idx) => (
                                <Box key={g.id} component="span">
                                  {g.courseTitle}
                                  {idx < Math.min(2, semesterGrades.length - 1) && ', '}
                                </Box>
                              ))}
                              {semesterGrades.length > 2 && (
                                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                  {' '}+{semesterGrades.length - 2} more
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No courses
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontWeight={700} color={`${statusColor}.main`}>
                          {item.gpa.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusLabel}
                          size="small"
                          color={statusColor as any}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ width: '100%', maxWidth: 200 }}>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(63, 136, 197, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor:
                                  item.gpa >= 3.5
                                    ? '#4caf50'
                                    : item.gpa >= 3.0
                                      ? '#3F88C5'
                                      : item.gpa >= 2.5
                                        ? '#ff9800'
                                        : '#f44336'
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                    {isExpanded && semesterGrades.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 2, backgroundColor: 'rgba(63, 136, 197, 0.04)' }}>
                          <Stack spacing={1.5}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                              Courses in {item.semester}:
                            </Typography>
                            <Stack spacing={1}>
                              {semesterGrades.map((grade) => (
                                <Stack
                                  key={grade.id}
                                  direction="row"
                                  spacing={2}
                                  alignItems="center"
                                  sx={{
                                    p: 1.5,
                                    backgroundColor: 'white',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'rgba(0, 0, 0, 0.08)'
                                  }}
                                >
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                      {grade.courseTitle}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {grade.courseCode} · {grade.credits} credit{grade.credits !== 1 ? 's' : ''}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={grade.grade}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, minWidth: 50 }}
                                  />
                                </Stack>
                              ))}
                            </Stack>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
              {!sortedGpa.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <Stack spacing={1} alignItems="center">
                      <SchoolRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                      <Typography variant="body1" fontWeight={600}>
                        No GPA records available yet
                      </Typography>
                      <Typography variant="body2">
                        Your GPA will appear here once grades are recorded for your courses.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </Paper>

      {/* GPA Scale Reference */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: 'rgba(63, 136, 197, 0.06)',
          border: '1px solid',
          borderColor: 'rgba(63, 136, 197, 0.2)'
        }}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            GPA Scale Reference
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Chip label="4.0 - 3.5: Excellent" color="success" variant="outlined" size="small" />
            <Chip label="3.4 - 3.0: Good" color="primary" variant="outlined" size="small" />
            <Chip label="2.9 - 2.5: Fair" color="warning" variant="outlined" size="small" />
            <Chip label="Below 2.5: Needs Improvement" color="error" variant="outlined" size="small" />
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

