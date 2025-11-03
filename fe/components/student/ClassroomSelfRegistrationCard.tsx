'use client';

import { useCallback, useMemo, useState } from 'react';
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

  const normalizedMajor = studentMajor?.trim().toLowerCase();

  const deriveFocusAreas = useCallback((room: ClassroomAvailability): string[] => {
    if (Array.isArray(room.focusAreas) && room.focusAreas.length) {
      return room.focusAreas;
    }

    return room.resources
      .map((resource) => {
        if (typeof resource !== 'string') {
          return null;
        }

        const match = resource.match(/^\s*Major:\s*(.+)$/i);
        return match ? match[1].trim() : null;
      })
      .filter((value): value is string => Boolean(value));
  }, []);

  const filteredClassrooms = useMemo(() => {
    if (!normalizedMajor) {
      return classroomList;
    }

    return classroomList.filter((room) => {
      const focusAreas = deriveFocusAreas(room);
      if (!focusAreas.length) {
        return true;
      }

      return focusAreas.some((area) => area.toLowerCase() === normalizedMajor);
    });
  }, [classroomList, normalizedMajor, deriveFocusAreas]);

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

  if (!filteredClassrooms.length) {
    return (
      <Paper elevation={0} sx={{  p: 3, backgroundColor: '#ffffff', border: '1px solid', borderColor: 'rgba(0,0,0,0.08)' }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <WorkspacePremiumRoundedIcon color="primary" fontSize="large" />
          <Typography variant="h6" fontWeight={700}>
            Major-specific classrooms coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {studentMajor
              ? `We’re preparing collaborative spaces tailored for the ${studentMajor} major. Please check back later or contact the IT team for assistance.`
              : 'Update your major to see recommended collaborative classrooms.'}
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
            Browse spaces curated by the IT team and reserve a seat for project work, study groups, or club meetups.
          </Typography>
          {studentMajor && (
            <Chip
              label={`Showing classes for ${studentMajor}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
        </Stack>

        <Stack spacing={2.5}>
          {filteredClassrooms.map((classroom) => {
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
            const nonMajorResources = classroom.resources.filter((resource) => !/^\s*Major:/i.test(resource));
            const displayedResources = nonMajorResources.slice(0, 4);
            const extraResources = Math.max(nonMajorResources.length - displayedResources.length, 0);

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
