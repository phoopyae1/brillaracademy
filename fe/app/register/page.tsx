import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';

export const metadata = {
  title: 'Student Accounts | Brillar Academy',
  description:
    'Student accounts are provisioned by the academy administration. Reach out to the appropriate team to get started.'
};

const contacts = [
  {
    label: 'IT Administrator',
    summary:
      'Manages platform access, integrations, and secure authentication for every student account that is provisioned.',
    email: 'it-admin@brillaracademy.edu'
  },
  {
    label: 'Teaching Team',
    summary:
      'Coordinates course enrollment details, class assignments, and ensures schedules reflect the most up-to-date syllabi.',
    email: 'faculty@brillaracademy.edu'
  },
  {
    label: 'Student Administrative Office',
    summary:
      'Confirms admission status, onboarding paperwork, and finalizes student profiles before activation.',
    email: 'admin-office@brillaracademy.edu'
  }
];

export default function RegisterPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F5F7FB',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.98)'
          }}
        >
          <Stack spacing={4}>
            <Stack spacing={1} textAlign="center">
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'primary.main' }}>
                Account provisioning
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                Student accounts are created for you
              </Typography>
              <Typography color="text.secondary">
                To keep our learning environment secure, students are onboarded by the administrative teams listed below. Reach
                out to the team that best matches your need and they will create or update your login details.
              </Typography>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Grid container spacing={3}>
              {contacts.map((contact) => (
                <Grid item xs={12} key={contact.label}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 3, md: 4 },
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 2,
                      alignItems: 'flex-start'
                    }}
                  >
                    <Stack spacing={1} sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip color="primary" label={contact.label} sx={{ fontWeight: 600 }} />
                        <Typography variant="body2" color="text.secondary">
                          {contact.email}
                        </Typography>
                      </Stack>
                      <Typography variant="body1" color="text.secondary">
                        {contact.summary}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Once your account is issued, you will receive login credentials and a direct link to your student dashboard.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
