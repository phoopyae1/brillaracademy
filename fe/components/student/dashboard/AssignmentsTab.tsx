"use client";

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import WarningIcon from '@mui/icons-material/Warning';
import { useTheme } from '@mui/material/styles';

type StudentAssignment = {
  id: number;
  teacherId: number;
  teacherName?: string | null;
  courseCode: string;
  courseTitle: string;
  title: string;
  description: string | null;
  dueDate: string;
  maxPoints: number | null;
  assignmentType: 'homework' | 'project' | 'quiz' | 'exam' | 'other';
  createdAt: string;
  updatedAt: string;
};

type AssignmentsTabProps = {
  assignments: StudentAssignment[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore'
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'Asia/Singapore'
  }).format(new Date(value));
}

function getAssignmentTypeColor(type: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
  switch (type) {
    case 'homework':
      return 'primary';
    case 'project':
      return 'secondary';
    case 'quiz':
      return 'info';
    case 'exam':
      return 'error';
    default:
      return 'default';
  }
}

function getAssignmentTypeLabel(type: string): string {
  switch (type) {
    case 'homework':
      return 'Homework';
    case 'project':
      return 'Project';
    case 'quiz':
      return 'Quiz';
    case 'exam':
      return 'Exam';
    default:
      return 'Other';
  }
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate).getTime() < Date.now();
}

function isDueSoon(dueDate: string, days: number = 3): boolean {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const daysInMs = days * 24 * 60 * 60 * 1000;
  return due >= now && due <= now + daysInMs;
}

export default function AssignmentsTab({ assignments }: AssignmentsTabProps) {
  const theme = useTheme();

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return dateA - dateB;
    });
  }, [assignments]);

  const overdueCount = useMemo(() => {
    return sortedAssignments.filter(a => isOverdue(a.dueDate)).length;
  }, [sortedAssignments]);

  const dueSoonCount = useMemo(() => {
    return sortedAssignments.filter(a => isDueSoon(a.dueDate) && !isOverdue(a.dueDate)).length;
  }, [sortedAssignments]);

  if (assignments.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          textAlign: 'center'
        }}
      >
        <Stack spacing={3} alignItems="center">
          <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary">
            No assignments yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your teachers haven&apos;t assigned any work yet. Check back soon!
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Summary Cards */}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            flex: 1,
            minWidth: 200,
            backgroundColor: '#ffffff',
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)'
          }}
        >
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Total Assignments
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {assignments.length}
            </Typography>
          </Stack>
        </Paper>

        {overdueCount > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              flex: 1,
              minWidth: 200,
              backgroundColor: '#fff5f5',
              border: '1px solid',
              borderColor: '#ffebee'
            }}
          >
            <Stack spacing={1} direction="row" alignItems="center">
              <WarningIcon sx={{ color: 'error.main' }} />
              <Stack>
                <Typography variant="body2" color="error.main" fontWeight={500}>
                  Overdue
                </Typography>
                <Typography variant="h4" fontWeight={600} color="error.main">
                  {overdueCount}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        )}

        {dueSoonCount > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              flex: 1,
              minWidth: 200,
              backgroundColor: '#fff9e6',
              border: '1px solid',
              borderColor: '#ffe0b2'
            }}
          >
            <Stack spacing={1}>
              <Typography variant="body2" color="warning.main" fontWeight={500}>
                Due Soon (3 days)
              </Typography>
              <Typography variant="h4" fontWeight={600} color="warning.main">
                {dueSoonCount}
              </Typography>
            </Stack>
          </Paper>
        )}
      </Stack>

      {/* Assignments Table */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <AssignmentIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" fontWeight={600}>
              Assignments by Teachers
            </Typography>
            <Chip
              label={assignments.length}
              size="small"
              sx={{ backgroundColor: theme.palette.primary.light, color: theme.palette.primary.contrastText }}
            />
          </Stack>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                <TableCell sx={{ fontWeight: 600 }}>Assignment</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Points</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAssignments.map((assignment) => {
                const overdue = isOverdue(assignment.dueDate);
                const dueSoon = isDueSoon(assignment.dueDate) && !overdue;

                return (
                  <TableRow
                    key={assignment.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      }
                    }}
                  >
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body1" fontWeight={500}>
                          {assignment.title}
                        </Typography>
                        {assignment.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                            {assignment.description.length > 100
                              ? `${assignment.description.substring(0, 100)}...`
                              : assignment.description}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={500}>
                            {assignment.courseCode}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {assignment.courseTitle}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {assignment.teacherName || 'Unknown'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getAssignmentTypeLabel(assignment.assignmentType)}
                        size="small"
                        color={getAssignmentTypeColor(assignment.assignmentType)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EventNoteIcon sx={{ fontSize: 16, color: overdue ? 'error.main' : 'text.secondary' }} />
                          <Typography
                            variant="body2"
                            color={overdue ? 'error.main' : dueSoon ? 'warning.main' : 'text.primary'}
                            fontWeight={overdue || dueSoon ? 600 : 400}
                          >
                            {formatDate(assignment.dueDate)}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(assignment.dueDate)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {assignment.maxPoints ? (
                        <Typography variant="body2" fontWeight={500}>
                          {assignment.maxPoints} pts
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {overdue ? (
                        <Chip
                          label="Overdue"
                          size="small"
                          color="error"
                          icon={<WarningIcon />}
                        />
                      ) : dueSoon ? (
                        <Chip
                          label="Due Soon"
                          size="small"
                          color="warning"
                        />
                      ) : (
                        <Chip
                          label="Upcoming"
                          size="small"
                          color="default"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}

