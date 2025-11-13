"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import EventIcon from '@mui/icons-material/Event';
import AnnouncementIcon from '@mui/icons-material/Campaign';
import { listAnnouncements, type Announcement, recordStudentAtenxionTransaction } from '@/lib/db';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore'
  }).format(new Date(value));
}

interface MessagesTabProps {
  studentId: number;
}

export default function MessagesTab({ studentId }: MessagesTabProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenAnnouncementIdsRef = useRef<Set<string>>(new Set());

  const triggerAtenxionTransaction = useCallback(async () => {
    try {
      await recordStudentAtenxionTransaction(studentId);
      console.log('[Frontend] Atenxion transaction recorded for announcements');
    } catch (err) {
      console.error('[Frontend] Atenxion transaction error (announcements):', err);
    }
  }, [studentId]);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        const data = await listAnnouncements();
        const previousIds = seenAnnouncementIdsRef.current;
        const nextIds = new Set(data.map((item) => String(item.id)));

        // Detect new announcements (ids that weren't previously seen)
        const isFirstLoadWithAnnouncements = previousIds.size === 0 && data.length > 0;
        const hasNewAnnouncement =
          data.some((item) => !previousIds.has(String(item.id)));

        if (isFirstLoadWithAnnouncements || (previousIds.size > 0 && hasNewAnnouncement)) {
          void triggerAtenxionTransaction();
        }

        seenAnnouncementIdsRef.current = nextIds;
        setAnnouncements(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };

    void loadAnnouncements();
  }, []);

  if (loading) {
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
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading announcements...
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'rgba(63, 136, 197, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MailRoundedIcon sx={{ fontSize: 28, color: '#3F88C5' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Announcements & Events
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stay updated with the latest news and upcoming events from the administration.
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      {announcements.length === 0 ? (
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
          <Stack spacing={2} alignItems="center">
            <MailRoundedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h6" fontWeight={600}>
              No Announcements Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check back later for updates from the administration.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {announcements.map((announcement) => (
            <Paper
              key={announcement.id}
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: '#ffffff',
                border: '1px solid',
                borderColor: 'rgba(0, 0, 0, 0.08)'
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: announcement.type === 'event' 
                        ? 'rgba(63, 136, 197, 0.1)' 
                        : 'rgba(156, 39, 176, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {announcement.type === 'event' ? (
                      <EventIcon sx={{ fontSize: 24, color: '#3F88C5' }} />
                    ) : (
                      <AnnouncementIcon sx={{ fontSize: 24, color: '#9C27B0' }} />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <Chip
                        label={announcement.type}
                        size="small"
                        color={announcement.type === 'event' ? 'primary' : 'default'}
                        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                      />
                      <Typography variant="h6" fontWeight={700}>
                        {announcement.title}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Posted {formatDateTime(announcement.createdAt)}
                      </Typography>
                      {announcement.postedByName && (
                        <>
                          <Typography variant="body2" color="text.secondary">•</Typography>
                          <Typography variant="body2" color="text.secondary">
                            By {announcement.postedByName}
                          </Typography>
                        </>
                      )}
                      {announcement.eventDate && (
                        <>
                          <Typography variant="body2" color="text.secondary">•</Typography>
                          <Typography variant="body2" color="primary.main" fontWeight={600}>
                            Event: {formatDateTime(announcement.eventDate)}
                          </Typography>
                        </>
                      )}
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {announcement.content}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
