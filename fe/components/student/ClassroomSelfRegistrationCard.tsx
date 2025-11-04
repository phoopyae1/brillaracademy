'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import type { ClassroomAvailability, ClassroomEnrollment } from '@/lib/db';
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
  const [registrationStates, setRegistrationStates] = useState<Record<number, RegistrationState>>({});

  const enrollmentLookup = useMemo(() => {
    const map = new Map<number, ClassroomEnrollment>();

    for (const enrollment of enrollmentList) {
      if (!map.has(enrollment.classroomId)) {
        map.set(enrollment.classroomId, enrollment);
      }
    }

    return map;
  }, [enrollmentList]);

  const handleRegistration = async (classroomId: number) => {
    setRegistrationStates((prev) => ({
      ...prev,
      [classroomId]: { status: 'loading' }
    }));

    try {
      const enrollment = await registerForClassroom({ studentId, classroomId });

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
        [classroomId]: {
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

      setRegistrationStates((prev) => ({
        ...prev,
        [classroomId]: {
          status: 'error',
          message
        }
      }));
    }
  };

  function normalizeMajorName(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const value = raw.trim().toLowerCase();
    const aliases: Record<string, string> = {
      'bme': 'biomedical engineering',
      'bio med': 'biomedical engineering',
      'biomed': 'biomedical engineering',
      'biomedical eng': 'biomedical engineering'
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

  // Filter classrooms to only show those with teaching assignments matching student's major
  // Only classrooms assigned by IT admin with teachers matching the student's major are shown
  const { prioritizedClassrooms, majorMatchIds, hasMajorSpecificClassrooms } = useMemo(() => {
    if (!normalizedMajor) {
      return {
        prioritizedClassrooms: [],
        majorMatchIds: new Set<number>(),
        hasMajorSpecificClassrooms: false
      };
    }

    // Filter to only show classrooms with courses matching the student's major
    const filtered = classroomList.filter((room) => {
      if (!room.courses || room.courses.length === 0) {
        return false; // Only show classrooms with teaching assignments
      }
      return room.courses.some((course) => {
        const courseMajor = normalizeMajorName(course.majorFocus) || '';
        return courseMajor === normalizedMajor || 
               courseMajor.includes(normalizedMajor) || 
               normalizedMajor.includes(courseMajor);
      });
    });

    const matchIds = new Set(filtered.map((room) => room.id));

    return {
      prioritizedClassrooms: filtered,
      majorMatchIds: matchIds,
      hasMajorSpecificClassrooms: matchIds.size > 0
    };
  }, [classroomList, normalizedMajor]);

  if (!classroomList.length) {
    return (
      <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0,0,0,0.08)' }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <WorkspacePremiumRoundedIcon color="primary" fontSize="large" />
          <Typography variant="h6" fontWeight={700}>
            Self-service classroom selection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administrators have not published any shared classrooms yet. Check back soon to claim a collaborative space.
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
              Claim a collaborative classroom
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Browse spaces with teaching assignments matching your major and reserve a seat for your classes.
          </Typography>
          {studentMajor && hasMajorSpecificClassrooms && (
            <Chip
              label={`Showing classrooms with ${studentMajor} teaching assignments`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          {studentMajor && !hasMajorSpecificClassrooms && (
            <Alert severity="info" variant="outlined">
              No classrooms have been assigned with teachers for the {studentMajor} major yet. Please contact IT admin to set up teaching assignments.
            </Alert>
          )}
        </Stack>

        <Stack spacing={2.5}>
          {prioritizedClassrooms.map((classroom) => {
            const enrollment = enrollmentLookup.get(classroom.id);
            const state = registrationStates[classroom.id];
            const progress = Math.min(
              100,
              classroom.capacity > 0 ? Math.round((classroom.seatsFilled / classroom.capacity) * 100) : 0
            );
            const isRegistered = Boolean(enrollment);
            const isLoading = state?.status === 'loading';
            const buttonDisabled = isRegistered || classroom.isFull || isLoading;
            const focusAreas = deriveFocusAreas(classroom);
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

            return (
              <Paper
                key={classroom.id}
                variant="outlined"
                sx={{  p: { xs: 2.5, md: 3 }, borderColor: 'rgba(59,130,246,0.16)', backgroundColor: 'rgba(248,250,255,0.6)' }}
              >
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {classroom.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {classroom.location}
                    </Typography>
                  </Stack>

                  {!!displayedResources.length && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {displayedResources.map((resource) => (
                        <Chip key={resource} label={resource} size="small" color="primary" variant="outlined" />
                      ))}
                      {extraResources > 0 && (
                        <Chip
                          label={`+${extraResources} more`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  )}

                  {focusAreas.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {focusAreas.map((area) => (
                        <Chip key={area} label={area} size="small" color="secondary" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                  
                  {filteredCourses && Array.isArray(filteredCourses) && filteredCourses.length > 0 && (
                    <Stack spacing={1.5} sx={{ pt: 1 }}>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Courses in this classroom
                      </Typography>
                      <Stack spacing={1}>
                        {filteredCourses.map((course, idx) => (
                          <Paper 
                            key={idx} 
                            variant="outlined" 
                            sx={{ 
                              p: 1.5, 
                              backgroundColor: 'rgba(99, 102, 241, 0.04)',
                              borderColor: 'rgba(99, 102, 241, 0.2)'
                            }}
                          >
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography variant="body2" fontWeight={600} color="primary.main">
                                  {course.courseTitle || 'Untitled Course'}
                                </Typography>
                                {course.courseCode && (
                                  <Chip 
                                    label={course.courseCode} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                {course.weekday && (
                                  <Typography variant="caption" color="text.secondary">
                                    📅 {course.weekday}
                                  </Typography>
                                )}
                                {course.startTime && course.endTime && (
                                  <Typography variant="caption" color="text.secondary">
                                    ⏰ {course.startTime}–{course.endTime}
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    </Stack>
                  )}

                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {classroom.seatsFilled} of {classroom.capacity} seats claimed
                      </Typography>
                      <Chip
                        size="small"
                        color={classroom.isFull ? 'default' : isRegistered ? 'success' : 'primary'}
                        variant={classroom.isFull ? 'outlined' : 'filled'}
                        label={classroom.isFull ? 'Full' : isRegistered ? 'Registered' : `${progress}% filled`}
                        sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(59,130,246,0.15)' }}
                    />
                  </Stack>

                  <Divider sx={{ borderStyle: 'dashed' }} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Box flexGrow={1}>
                      {isRegistered ? (
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          Reserved on {formatRegisteredAt(enrollment!.registeredAt)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Secure a spot to collaborate with peers in this space.
                        </Typography>
                      )}
                    </Box>
                    <Button
                      onClick={() => handleRegistration(classroom.id)}
                      disabled={buttonDisabled}
                      variant="contained"
                      color={isRegistered ? 'success' : 'primary'}
                    >
                      {isLoading ? 'Reserving…' : isRegistered ? 'Registered' : 'Reserve seat'}
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
          })}
        </Stack>
      </Stack>
    </Paper>
  );
}
