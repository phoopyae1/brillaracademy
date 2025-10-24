"use client";

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function StudentPortalSection() {
  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 4,
        boxShadow: 3,
        px: { xs: 3, md: 6 },
        py: { xs: 4, md: 6 },
      }}
    >
      <Stack spacing={4}>
        <Stack spacing={1} textAlign={{ xs: 'center', md: 'left' }}>
          <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 2 }}>
            Student Portal
          </Typography>
          <Typography variant="h4" component="h2">
            Access your account, manage classes, and stay on track
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 640, mx: { xs: 'auto', md: 0 } }}>
            A dedicated area for students to sign in securely, review their schedule, and register for upcoming classes.
          </Typography>
        </Stack>

        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                p: { xs: 3, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <Stack spacing={1}>
                <Typography variant="h6">Student Login</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Log in with your academy email to access assignments, grades, and personalized updates.
                </Typography>
              </Stack>

              <Stack spacing={2} component="form">
                <TextField label="Email address" type="email" required fullWidth autoComplete="email" />
                <TextField label="Password" type="password" required fullWidth autoComplete="current-password" />
                <Button variant="contained" size="large">Sign In</Button>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Button variant="text" size="small" sx={{ px: 0 }}>Forgot password?</Button>
                  <Button variant="text" size="small" sx={{ px: 0 }}>Activate new account</Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                p: { xs: 3, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <Stack spacing={1}>
                <Typography variant="h6">Quick Class Registration</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Register for new classes, review credit loads, and secure your seat in upcoming sessions.
                </Typography>
              </Stack>

              <Stack spacing={3} component="form">
                <FormControl fullWidth required>
                  <InputLabel id="term-label">Academic term</InputLabel>
                  <Select labelId="term-label" label="Academic term" defaultValue="">
                    <MenuItem value="">
                      <em>Select term</em>
                    </MenuItem>
                    <MenuItem value="2024-fall">Fall 2024</MenuItem>
                    <MenuItem value="2025-spring">Spring 2025</MenuItem>
                    <MenuItem value="2025-summer">Summer 2025</MenuItem>
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="Course code" placeholder="e.g. BIO 210" required fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Section" placeholder="e.g. 03" fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Advisor" placeholder="Faculty mentor" fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Preferred schedule" placeholder="Morning, Afternoon, etc." fullWidth />
                  </Grid>
                </Grid>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Stack spacing={2}>
                  <TextField label="Additional notes" multiline minRows={3} placeholder="Share prerequisites, accommodations, or goals" fullWidth />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Button
                      variant="outlined"
                      sx={{
                        width: { xs: '100%', sm: 'auto' }
                      }}
                    >
                      Save draft
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        width: { xs: '100%', sm: 'auto' }
                      }}
                    >
                      Submit registration
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
