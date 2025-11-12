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
    timetable,
    schedule,
    registrations,
    grades,
    upcomingExams,
    gpaBySemester,
    registrationWindows,
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
            timetable={timetable}
            schedule={schedule}
            registrations={registrations}
            grades={grades}
            upcomingExams={upcomingExams}
            gpaBySemester={gpaBySemester}
            registrationWindows={registrationWindows}
            fees={fees}
            classroomEnrollments={classroomEnrollments}
            availableClassrooms={availableClassrooms}
          />
        );
      case 'courses':
        return <CoursesTab registrations={registrations} timetable={timetable} fees={fees} />;
      case 'planning':
        return <PlanningTab schedule={schedule} registrationWindows={registrationWindows} timetable={timetable} />;
      case 'gpa':
        return <StatisticsTab grades={grades} gpaBySemester={gpaBySemester} registrations={registrations} />;
      // case 'gpa':
      //   return <GPATab gpaBySemester={gpaBySemester} grades={grades} />;
      case 'assignments':
        return <AssignmentsTab assignments={assignments} />;
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
        py: { xs: 5, md: 8 },
        px: { xs: 2, md: 3 }
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Left Sidebar */}
          <Grid item xs={12} md={3} lg={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                height: '100%',
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.6)',
                position: 'sticky',
                top: 20
              }}
            >
              <Stack spacing={4}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Image
                      src="/assets/brillar-logo.png"
                      alt="Brillar Academy Logo"
                      width={32}
                      height={32}
                      style={{ objectFit: 'contain' }}
                    />
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      Brillar Academy
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    Student Portal
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Navigate through your courses, plan your week, and monitor key milestones from a single dashboard.
                  </Typography>
                </Stack>

                <List disablePadding>
                  {navItems.map((item) => {
                    const isSelected = activeTab === item.id;
                    return (
                      <ListItemButton
                        key={item.id}
                        selected={isSelected}
                        onClick={() => setActiveTab(item.id)}
                        sx={{
                          mb: 1.5,
                          backgroundColor: isSelected ? '#E0F2F7' : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected ? '#D0E8F0' : 'rgba(63, 136, 197, 0.08)'
                          },
                          '&.Mui-selected:hover': {
                            backgroundColor: '#D0E8F0'
                          },
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isSelected ? 'primary.main' : 'text.secondary',
                            minWidth: 40
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? 'primary.main' : 'text.primary'
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    background: 'rgba(255, 255, 255, 0.98)',
                    borderColor: 'rgba(63, 136, 197, 0.2)'
                  }}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Need a hand?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contact your advisor for course adjustments or curriculum guidance at any time.
                    </Typography>
                    <Chip
                      label="Advisor support"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ alignSelf: 'flex-start' }}
                    />
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Grid>

          {/* Main Content Area */}
          <Grid item xs={12} md={9} lg={9}>
            <Stack spacing={4}>
              {/* Header Bar */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  background: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid rgba(63, 136, 197, 0.15)'
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={3}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack spacing={1.5}>
                    <Chip
                      label="Student dashboard"
                      size="small"
                      color="primary"
                      sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                    />
                    <Typography variant="h4" fontWeight={700}>
                      Hello {student.firstName} 👋
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460 }}>
                      Here&apos;s a snapshot of your learning journey. Track schedules, assessments, and outstanding
                      actions for the week.
                    </Typography>
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
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                    >
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

              {/* Tab Content */}
              {renderTabContent()}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
