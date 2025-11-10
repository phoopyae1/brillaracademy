'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WarningIcon from '@mui/icons-material/Warning';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import type { ClassroomAvailability, ClassroomEnrollment, ClassroomCourse } from '@/lib/db';
import { registerForClassroom } from '@/lib/db';

type RegistrationState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
};

type ClassroomSelfRegistrationCardProps = {
  studentId: number;
  classrooms: ClassroomAvailability[];
  enrollments: ClassroomEnrollment[];
  studentMajor?: string | null;
};

function formatRegisteredAt(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function ClassroomSelfRegistrationCard({
  studentId,
  classrooms,
  enrollments,
  studentMajor
}: ClassroomSelfRegistrationCardProps) {
  const router = useRouter();
  const [classroomList, setClassroomList] = useState(classrooms);
  const [enrollmentList, setEnrollmentList] = useState(enrollments);
  const [registrationStates, setRegistrationStates] = useState<Record<string, RegistrationState>>({});
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    courseCode: string;
    classroomId: number;
    conflictMessage: string;
  }>({ open: false, courseCode: '', classroomId: 0, conflictMessage: '' });

  const enrollmentLookup = useMemo(() => {
    const map = new Map<number, ClassroomEnrollment>();

    for (const enrollment of enrollmentList) {
      if (!map.has(enrollment.classroomId)) {
        map.set(enrollment.classroomId, enrollment);
      }
    }

    return map;
  }, [enrollmentList]);

  const handleRegistration = async (classroomId: number, courseCode: string, weekday?: string, startTime?: string) => {
    // Include weekday and startTime in the key to handle multiple sections of same course
    const registrationKey = `${classroomId}-${courseCode}-${weekday}-${startTime}`;
    console.log(`[Frontend] Registering student ${studentId} for classroom ${classroomId}, courseCode: "${courseCode}", weekday: "${weekday}", startTime: "${startTime}"`);
    
    setRegistrationStates((prev) => ({
      ...prev,
      [registrationKey]: { status: 'loading' }
    }));

    try {
      const enrollment = await registerForClassroom({ 
        studentId, 
        classroomId, 
        courseCode,
        weekday, // Pass specific weekday for conflict checking
        startTime // Pass specific start time for conflict checking
      });
      console.log(`[Frontend] Registration successful for course ${courseCode}`);

      setEnrollmentList((prev) =>
        [...prev, enrollment].sort(
          (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
        )
      );

      setClassroomList((prev) =>
        prev.map((room) => {
          if (room.id !== classroomId) {
            return room;
          }

          const seatsFilled = Math.min(room.seatsFilled + 1, room.capacity);
          const seatsAvailable = Math.max(room.capacity - seatsFilled, 0);

          return {
            ...room,
            seatsFilled,
            seatsAvailable,
            isFull: seatsAvailable === 0
          };
        })
      );

      setRegistrationStates((prev) => ({
        ...prev,
        [registrationKey]: {
          status: 'success',
          message: `You have reserved a spot. ${formatRegisteredAt(enrollment.registeredAt)} registration confirmed.`
        }
      }));

      // Refresh the page to show the new class registration in the dashboard
      // Wait a bit to ensure the database transaction is committed
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' ? error.message : 'Unable to register for this classroom.';

      // Check if this is a schedule conflict - show confirmation dialog
      if (message.startsWith('SCHEDULE_CONFLICT:')) {
        const conflictMessage = message.replace('SCHEDULE_CONFLICT: ', '');
        setConflictDialog({
          open: true,
          courseCode,
          classroomId,
          conflictMessage
        });
        setRegistrationStates((prev) => ({
          ...prev,
          [registrationKey]: { status: 'idle' }
        }));
      } else {
        setRegistrationStates((prev) => ({
          ...prev,
          [registrationKey]: {
            status: 'error',
            message
          }
        }));
      }
    }
  };

  const handleConflictConfirm = async () => {
    const { courseCode: confirmCourseCode, classroomId: confirmClassroomId } = conflictDialog;
    setConflictDialog({ open: false, courseCode: '', classroomId: 0, conflictMessage: '' });
    
    // Retry registration with a flag to bypass conflict check (or just proceed)
    // Since we're already past the conflict check in backend, we'll need to handle this differently
    // For now, we'll just retry - the backend will need to allow proceeding after warning
    const registrationKey = `${confirmClassroomId}-${confirmCourseCode}`;
    setRegistrationStates((prev) => ({
      ...prev,
      [registrationKey]: { status: 'loading' }
    }));

    try {
      // Note: We might need to add a bypass flag to the API, but for now
      // we'll just show the conflict and let the user know they need to choose a different time
      // Actually, let's modify the backend to accept a "force" parameter
      throw new Error('Please contact administration to register for conflicting courses.');
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' ? error.message : 'Unable to register for this course.';
      setRegistrationStates((prev) => ({
        ...prev,
        [registrationKey]: {
          status: 'error',
          message
        }
      }));
    }
  };

  const handleConflictCancel = () => {
    setConflictDialog({ open: false, courseCode: '', classroomId: 0, conflictMessage: '' });
  };

  function normalizeMajorName(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const value = raw.trim().toLowerCase();
    const aliases: Record<string, string> = {
      'bme': 'biomedical engineering',
      'bio med': 'biomedical engineering',
      'biomed': 'biomedical engineering',
      'biomedical eng': 'biomedical engineering',
      'business': 'business administration',
      'business admin': 'business administration',
      'bus admin': 'business administration',
      'data sci': 'data science',
      'international relations': 'international relations',
      'intl relations': 'international relations',
      'digital media': 'digital media design',
      'environmental sci': 'environmental science',
      'hospitality': 'hospitality management',
      'ai': 'artificial intelligence',
      'it': 'information technology',
      'cybersecurity': 'cybersecurity',
      'cyber security': 'cybersecurity',
    };
    return aliases[value] ?? value;
  }

  const normalizedMajor = normalizeMajorName(studentMajor);

  const deriveFocusAreas = useCallback((room: ClassroomAvailability): string[] => {
    // Prefer majors from course assignments if available
    if (Array.isArray(room.courses) && room.courses.length > 0) {
      const majors = new Set<string>();
      for (const course of room.courses) {
        const major = course.majorFocus?.trim();
        if (major) majors.add(major);
      }
      if (majors.size > 0) {
        return Array.from(majors);
      }
    }

    // Then use any provided focusAreas
    if (Array.isArray(room.focusAreas) && room.focusAreas.length) {
      return room.focusAreas;
    }

    // Do not infer majors from resources anymore
    return [];
  }, []);

  // Backend already filters by major, so we trust what it returns
  // Frontend just does a safety check to ensure courses exist
  const { prioritizedClassrooms, majorMatchIds, hasMajorSpecificClassrooms } = useMemo(() => {
    console.log(`[Frontend] Received ${classroomList.length} classroom(s) from backend`);
    console.log(`[Frontend] Student major: "${studentMajor}" (normalized: "${normalizedMajor || 'none'}")`);
    
    classroomList.forEach((room, idx) => {
      console.log(`[Frontend] Classroom ${idx + 1}: "${room.name}" with ${room.courses?.length || 0} course(s)`);
      room.courses?.forEach((course, cIdx) => {
        console.log(`[Frontend]   Course ${cIdx + 1}: "${course.courseTitle}" by ${course.teacherName || 'Unknown'} (major_focus: "${course.majorFocus}")`);
      });
    });

    // Backend already filtered by major, so just filter out classrooms with no courses
    // (shouldn't happen, but safety check)
    const filtered = classroomList.filter((room) => {
      return room.courses && room.courses.length > 0;
    });

    console.log(`[Frontend] After filtering: ${filtered.length} classroom(s) with courses`);

    // Count classrooms with matching major (for display purposes)
    const matchingClassrooms = normalizedMajor 
      ? filtered.filter((room) => {
          return room.courses?.some((course) => {
        const courseMajor = normalizeMajorName(course.majorFocus) || '';
        return courseMajor === normalizedMajor || 
               courseMajor.includes(normalizedMajor) || 
               normalizedMajor.includes(courseMajor);
      });
        })
      : filtered;

    const matchIds = new Set(matchingClassrooms.map((room) => room.id));

    return {
      prioritizedClassrooms: filtered, // Show all classrooms returned by backend (already filtered)
      majorMatchIds: matchIds,
      hasMajorSpecificClassrooms: matchIds.size > 0
    };
  }, [classroomList, normalizedMajor, studentMajor]);

  if (!classroomList.length) {
    return (
      <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0,0,0,0.08)' }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <WorkspacePremiumRoundedIcon color="primary" fontSize="large" />
          <Typography variant="h6" fontWeight={700}>
            Self-service classroom selection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {studentMajor 
              ? `No classrooms with ${studentMajor} courses are available yet. Administrators need to create teaching assignments for ${studentMajor} courses.`
              : 'Administrators have not published any shared classrooms yet. Check back soon to claim a collaborative space.'}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0,0,0,0.08)' }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CelebrationRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {studentMajor ? `${studentMajor} Courses` : 'Available Courses'}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {studentMajor 
              ? `Courses available for ${studentMajor} students. Register for a classroom to enroll in these courses.`
              : 'Browse available courses and reserve a seat for your classes.'}
          </Typography>
          {studentMajor && hasMajorSpecificClassrooms && (
            <Chip
              label={`${prioritizedClassrooms.reduce((sum, room) => sum + (room.courses?.length || 0), 0)} ${studentMajor} course(s) available`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          {studentMajor && !hasMajorSpecificClassrooms && (
            <Alert severity="info" variant="outlined">
              No courses have been assigned for the {studentMajor} major yet. Please contact IT admin to set up teaching assignments.
            </Alert>
          )}
        </Stack>

        <Stack spacing={2.5}>
          {(() => {
            // Transform: Create one card per course instead of one card per classroom
            const courseCards: Array<{
              course: ClassroomCourse;
              classroom: ClassroomAvailability;
              enrollment: ClassroomEnrollment | undefined;
              state: RegistrationState | undefined;
              progress: number;
              isRegistered: boolean;
              sameSubjectRegistered: boolean;
              isLoading: boolean;
              buttonDisabled: boolean;
              displayedResources: string[];
              extraResources: number;
            }> = [];

            prioritizedClassrooms.forEach((classroom) => {
            const enrollment = enrollmentLookup.get(classroom.id);
            // Filter out "Major:" resources since buildings are not restricted by major
            const nonMajorResources = classroom.resources.filter((resource) => !/^\s*Major:/i.test(resource));
            const displayedResources = nonMajorResources.slice(0, 4);
            const extraResources = Math.max(nonMajorResources.length - displayedResources.length, 0);
            
            // Show only courses matching student's major (from teaching assignments)
            const filteredCourses = studentMajor && classroom.courses
              ? classroom.courses.filter((course) => {
                  const courseMajor = normalizeMajorName(course.majorFocus) || '';
                  const normalizedStudentMajor = normalizeMajorName(studentMajor) || '';
                  return courseMajor === normalizedStudentMajor || 
                         courseMajor.includes(normalizedStudentMajor) || 
                         normalizedStudentMajor.includes(courseMajor);
                })
              : classroom.courses || [];

              // Create a separate card for each course
              filteredCourses.forEach((course) => {
                // Include weekday and startTime in the key to handle multiple sections of same course
                const registrationKey = `${classroom.id}-${course.courseCode}-${course.weekday}-${course.startTime}`;
                const state = registrationStates[registrationKey];
                // Use course-specific registration status from backend (isRegistered flag)
                // This is the authoritative source for course registration status
                const isRegistered = course.isRegistered === true;
                const sameSubjectRegistered = course.sameSubjectRegistered === true;
                const isLoading = state?.status === 'loading';
                // Calculate progress per course (not per classroom)
                const courseSeatsFilled = course.seatsFilled ?? classroom.seatsFilled;
                const progress = Math.min(
                  100,
                  classroom.capacity > 0 ? Math.round((courseSeatsFilled / classroom.capacity) * 100) : 0
                );
                const courseIsFull = course.isFull ?? classroom.isFull;
                const buttonDisabled = isRegistered || sameSubjectRegistered || courseIsFull || isLoading;
                
                courseCards.push({
                  course,
                  classroom,
                  enrollment,
                  state,
                  progress,
                  isRegistered,
                  sameSubjectRegistered,
                  isLoading,
                  buttonDisabled,
                  displayedResources,
                  extraResources
                });
              });
            });

            return courseCards.map((cardData, cardIndex) => {
              const { course, classroom, enrollment, state, progress, isRegistered, sameSubjectRegistered, isLoading, buttonDisabled, displayedResources, extraResources } = cardData;

            return (
              <Paper
                  key={`${classroom.id}-${course.courseCode}-${cardIndex}`}
                variant="outlined"
                  sx={{  p: { xs: 2.5, md: 3 }, borderColor: 'rgba(63, 136, 197, 0.16)', backgroundColor: 'rgba(248,250,255,0.6)' }}
              >
                  <Stack spacing={2.5}>
                    {/* MAJOR and COURSE - Primary Focus */}
                <Stack spacing={2}>
                      {/* Show major prominently */}
                      {course.majorFocus && (
                        <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={course.majorFocus} 
                            size="medium" 
                          color="primary"
                            variant="filled"
                            sx={{ fontWeight: 600, fontSize: '0.875rem' }}
                          />
                    </Stack>
                  )}
                  
                      {/* Single Course - Primary information */}
                      <Stack spacing={1.5}>
                        <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Available Course
                      </Typography>
                          <Paper 
                            variant="outlined" 
                            sx={{ 
                            p: 2, 
                            backgroundColor: 'rgba(63, 136, 197, 0.06)',
                            borderColor: 'rgba(63, 136, 197, 0.25)',
                            borderWidth: 1.5
                            }}
                          >
                          <Stack spacing={1.5}>
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography variant="body1" fontWeight={700} color="primary.main">
                                  {course.courseTitle || 'Untitled Course'}
                                </Typography>
                                {course.courseCode && (
                                  <Chip 
                                    label={course.courseCode} 
                                    size="small" 
                                    variant="filled"
                                    color="primary"
                                    sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                                  />
                                )}
                              </Stack>
                              {course.teacherName && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                  👨‍🏫 Teacher: <strong>{course.teacherName}</strong>
                                </Typography>
                              )}
                            </Stack>
                            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                                {course.weekday && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    📅 {course.weekday}
                                  </Typography>
                                )}
                                {course.startTime && course.endTime && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    ⏰ {course.startTime}–{course.endTime}
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                          </Paper>
                      </Stack>
                    </Stack>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    {/* Classroom Info - Secondary Information */}
                    <Stack spacing={1}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Classroom Location
                      </Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}>
                          {classroom.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          📍 {classroom.location}
                        </Typography>
                      </Stack>
                      
                      {!!displayedResources.length && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {displayedResources.map((resource) => (
                            <Chip key={resource} label={resource} size="small" color="default" variant="outlined" />
                          ))}
                          {extraResources > 0 && (
                            <Chip
                              label={`+${extraResources} more`}
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                    </Stack>
                  )}
                    </Stack>

                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {course.seatsFilled ?? classroom.seatsFilled} of {classroom.capacity} seats claimed
                      </Typography>
                      <Chip
                        size="small"
                        color={(course.isFull ?? classroom.isFull) ? 'default' : isRegistered ? 'success' : 'primary'}
                        variant={(course.isFull ?? classroom.isFull) ? 'outlined' : 'filled'}
                        label={(course.isFull ?? classroom.isFull) ? 'Full' : isRegistered ? 'Registered' : `${progress}% filled`}
                        sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                        sx={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(63, 136, 197, 0.15)' }}
                    />
                  </Stack>

                  <Divider sx={{ borderStyle: 'dashed' }} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Box flexGrow={1}>
                      {isRegistered ? (
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          {enrollment?.registeredAt 
                            ? `Reserved on ${formatRegisteredAt(enrollment.registeredAt)}`
                            : 'Registration confirmed'}
                        </Typography>
                      ) : sameSubjectRegistered ? (
                        <Typography variant="body2" color="warning.main" fontWeight={600}>
                          Already registered for {course.courseCode} at a different time
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                            Register for this course to secure your spot.
                        </Typography>
                      )}
                    </Box>
                    <Button
                        onClick={() => handleRegistration(classroom.id, course.courseCode, course.weekday, course.startTime)}
                      disabled={buttonDisabled}
                      variant="contained"
                      color={isRegistered ? 'success' : sameSubjectRegistered ? 'secondary' : 'primary'}
                    >
                        {isLoading ? 'Reserving…' : isRegistered ? 'Registered' : sameSubjectRegistered ? 'Already Enrolled' : 'Register for Course'}
                    </Button>
                  </Stack>

                  {state?.status === 'success' && state.message && (
                    <Alert severity="success" variant="outlined">
                      {state.message}
                    </Alert>
                  )}

                  {state?.status === 'error' && state.message && (
                    <Alert severity="error" variant="outlined">
                      {state.message}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            );
            });
          })()}
        </Stack>
      </Stack>

      {/* Schedule Conflict Warning Dialog */}
      <Dialog
        open={conflictDialog.open}
        onClose={handleConflictCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WarningIcon color="warning" fontSize="large" />
            <Typography variant="h6" fontWeight={700}>
              Schedule Conflict Detected
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography variant="body1" paragraph>
              {conflictDialog.conflictMessage}
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                You cannot attend two courses at the same time. Please choose a different course or contact administration if you need special arrangements.
              </Typography>
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConflictCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConflictConfirm} color="warning" variant="contained">
            Contact Admin
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
