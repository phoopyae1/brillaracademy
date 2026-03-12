"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Image from 'next/image';
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
import TableContainer from '@mui/material/TableContainer';
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
import GradeIcon from '@mui/icons-material/Grade';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ClassroomSelfRegistrationCard from '@/components/student/ClassroomSelfRegistrationCard';
import type { StudentDashboardData, ClassroomAvailability, ClassroomEnrollment } from '@/lib/db';
import { recordStudentAtenxionTransaction } from '@/lib/db';

// Tab Views
import OverviewTab from './dashboard/OverviewTab';
import CoursesTab from './dashboard/CoursesTab';
import PlanningTab from './dashboard/PlanningTab';
import StatisticsTab from './dashboard/StatisticsTab';
import GPATab from './dashboard/GPATab';
import MessagesTab from './dashboard/MessagesTab';
import AssignmentsTab from './dashboard/AssignmentsTab';

type TabId = 'overview' | 'courses' | 'planning' | 'gpa' | 'messages' | 'assignments';

interface StudentDashboardProps {
  dashboard: StudentDashboardData;
  availableClassrooms: ClassroomAvailability[];
  classroomEnrollments: ClassroomEnrollment[];
}

const navItems: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <DashboardRoundedIcon fontSize="small" /> },
  { id: 'courses', label: 'Courses', icon: <SchoolRoundedIcon fontSize="small" /> },
  { id: 'planning', label: 'Planning', icon: <EventNoteRoundedIcon fontSize="small" /> },
  { id: 'gpa', label: 'GPA', icon: <QueryStatsRoundedIcon fontSize="small" /> },
  // { id: 'gpa', label: 'GPA', icon: <GradeIcon fontSize="small" /> },
  { id: 'assignments', label: 'Assignments', icon: <AssignmentIcon fontSize="small" /> },
  { id: 'messages', label: 'Messages', icon: <MailRoundedIcon fontSize="small" /> }
];

export default function StudentDashboard({
  dashboard,
  availableClassrooms,
  classroomEnrollments
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const {
    student,
    currentSemester,
    timetable,
    schedule,
    registrations,
    historicalRegistrations,
    grades,
    upcomingExams,
    gpaBySemester,
    registrationWindows,
    semesterDates,
    fees,
    assignments,
    classroomEnrollments: dashboardEnrollments
  } = dashboard;

  const triggerAtenxionTransaction = useCallback(async () => {
    try {
      await recordStudentAtenxionTransaction(student.id);
      console.log('[Frontend] Atenxion transaction recorded for dashboard changes');
    } catch (error) {
      console.error('[Frontend] Atenxion transaction error (dashboard):', error);
    }
  }, [student.id]);

  const prevGradesRef = useRef<Set<number> | null>(null);
  const prevFeesStatusRef = useRef<Map<number, string> | null>(null);
  const prevAssignmentsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const currentGradeIds = new Set(grades.map((grade) => grade.id));

    if (prevGradesRef.current === null) {
      if (currentGradeIds.size > 0) {
        void triggerAtenxionTransaction();
      }
      prevGradesRef.current = currentGradeIds;
      return;
    }

    const previousGradeIds = prevGradesRef.current;
    const hasNewGrade = Array.from(currentGradeIds).some((id) => !previousGradeIds.has(id));

    if (hasNewGrade) {
      void triggerAtenxionTransaction();
    }

    prevGradesRef.current = currentGradeIds;
  }, [grades, triggerAtenxionTransaction]);

  useEffect(() => {
    const currentStatus = new Map<number, string>();
    fees.forEach((fee) => {
      currentStatus.set(fee.id, fee.status);
    });

    if (prevFeesStatusRef.current) {
      const previousStatus = prevFeesStatusRef.current;
      const allIds = new Set<number>([
        ...Array.from(previousStatus.keys()),
        ...Array.from(currentStatus.keys())
      ]);

      const hasStatusChange = Array.from(allIds).some((id) => previousStatus.get(id) !== currentStatus.get(id));

      if (hasStatusChange) {
        void triggerAtenxionTransaction();
      }
    } else if (currentStatus.size > 0) {
      // First load with fee data present
      void triggerAtenxionTransaction();
    }

    prevFeesStatusRef.current = currentStatus;
  }, [fees, triggerAtenxionTransaction]);

  useEffect(() => {
    const currentAssignmentIds = new Set(assignments.map((assignment) => assignment.id));

    if (prevAssignmentsRef.current === null) {
      if (currentAssignmentIds.size > 0) {
        void triggerAtenxionTransaction();
      }
      prevAssignmentsRef.current = currentAssignmentIds;
      return;
    }

    const previousAssignments = prevAssignmentsRef.current;
    const hasNewAssignment = Array.from(currentAssignmentIds).some((id) => !previousAssignments.has(id));

    if (hasNewAssignment) {
      void triggerAtenxionTransaction();
    }

    prevAssignmentsRef.current = currentAssignmentIds;
  }, [assignments, triggerAtenxionTransaction]);

  const avatarInitials = `${student.firstName.charAt(0)}${student.lastName ? student.lastName.charAt(0) : ''}`;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            student={student}
            currentSemester={currentSemester}
            timetable={timetable}
            schedule={schedule}
            registrations={registrations}
            grades={grades}
            upcomingExams={upcomingExams}
            gpaBySemester={gpaBySemester}
            registrationWindows={registrationWindows}
            semesterDates={semesterDates || []}
            fees={fees}
            classroomEnrollments={classroomEnrollments}
            availableClassrooms={availableClassrooms}
          />
        );
      case 'courses':
        return <CoursesTab currentSemester={currentSemester} registrations={registrations} historicalRegistrations={historicalRegistrations || []} timetable={timetable} fees={fees} />;
      case 'planning':
        return <PlanningTab currentSemester={currentSemester} schedule={schedule} registrationWindows={registrationWindows} semesterDates={semesterDates || []} timetable={timetable} />;
      case 'gpa':
        return <StatisticsTab currentSemester={currentSemester} grades={grades} gpaBySemester={gpaBySemester} registrations={registrations} />;
      // case 'gpa':
      //   return <GPATab gpaBySemester={gpaBySemester} grades={grades} />;
      case 'assignments':
        return <AssignmentsTab currentSemester={currentSemester} assignments={assignments} />;
      case 'messages':
        return <MessagesTab studentId={student.id} />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F5F7FB',
        py: { xs: 4, md: 6 },
        px: { xs: 2, md: 3 }
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={3}>
          {/* Left Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                height: 'fit-content',
                background: '#ffffff',
                border: '1px solid',
                borderColor: 'divider',
                position: 'sticky',
                top: 20
              }}
            >
              <Stack spacing={3}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Image
                      src="/assets/brillar-logo.png"
                      alt="Brillar Academy Logo"
                      width={56}
                      height={56}
                      style={{ objectFit: 'contain' }}
                    />
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      Brillar Academy
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Student Portal
                  </Typography>
                  {currentSemester && (
                    <Chip
                      label={`Semester: ${currentSemester}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{
                        width: 'fit-content',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}
                    />
                  )}
                </Stack>

                <Divider />

                <List disablePadding>
                  {navItems.map((item) => {
                    const isSelected = activeTab === item.id;
                    return (
                      <ListItemButton
                        key={item.id}
                        selected={isSelected}
                        onClick={() => setActiveTab(item.id)}
                        sx={{
                          mb: 0.5,
                          borderRadius: 1,
                          backgroundColor: isSelected ? 'primary.light' : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected ? 'primary.light' : 'action.hover'
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                            '&:hover': {
                              backgroundColor: 'primary.light'
                            }
                          }
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isSelected ? 'primary.main' : 'text.secondary',
                            minWidth: 36
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: '0.875rem'
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Stack>
            </Paper>
          </Grid>

          {/* Main Content Area */}
          <Grid item xs={12} md={9}>
            <Stack spacing={3}>
              {/* Header Bar */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  background: '#ffffff',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={3}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Typography variant="h5" fontWeight={700}>
                      Hello, {student.firstName} 👋
                    </Typography>
                      {currentSemester && (
                        <Chip
                          label={`Current Semester: ${currentSemester}`}
                          size="small"
                          color="primary"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Here&apos;s a snapshot of your learning journey. Track schedules, assessments, and outstanding actions.
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <IconButton size="small">
                      <Badge color="error" variant="dot" overlap="circular">
                        <NotificationsRoundedIcon />
                      </Badge>
                    </IconButton>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 40,
                        height: 40,
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      {avatarInitials.toUpperCase()}
                    </Avatar>
                  </Stack>
                </Stack>
              </Paper>

              {/* Tab Content */}
              {renderTabContent()}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
