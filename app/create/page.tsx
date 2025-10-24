import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';

export const metadata = {
  title: 'Create a Class | Brillar Academy',
  description: 'Design a new Brillar Academy class by outlining outcomes, schedules, and collaborative resources.'
};

const topics = ['STEM', 'Arts', 'Languages', 'Wellness', 'Leadership', 'Innovation'];

export default function CreatePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #FDF2FF 0%, #F5FBFF 100%)',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={10}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(16px)'
          }}
        >
          <Stack spacing={4}>
            <Box textAlign="center">
              <Typography variant="h3" fontWeight={700} gutterBottom>
                Craft a new learning experience ✨
              </Typography>
              <Typography color="text.secondary">
                Fill out the essentials below to publish a new class to the Brillar Academy community.
              </Typography>
            </Box>

            <Stack spacing={3} component="form" noValidate>
              <TextField label="Class name" placeholder="e.g. Creative Coding Lab" required fullWidth />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Audience" placeholder="Grade 9-10" required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Duration" placeholder="8-week intensive" required fullWidth />
                </Grid>
              </Grid>
              <TextField
                label="Class description"
                multiline
                minRows={4}
                placeholder="Share what makes this class special, key outcomes, and collaborative projects."
                required
                fullWidth
              />
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Featured topics
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {topics.map((topic) => (
                    <Chip key={topic} label={topic} color="primary" variant="outlined" sx={{ mb: 1 }} />
                  ))}
                </Stack>
              </Box>
              <Divider light />
              <TextField
                label="Collaboration tools"
                placeholder="Add links to documents, videos, or community spaces"
                fullWidth
              />
              <Button variant="contained" color="primary" size="large" sx={{ py: 1.4 }}>
                Publish class proposal
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
