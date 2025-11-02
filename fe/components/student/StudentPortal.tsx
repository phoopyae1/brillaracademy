"use client";

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';

export default function StudentPortalSection() {
  return (
    <Box
      component="section"
      sx={(theme) => ({
        width: '100%',
        background: `linear-gradient(140deg, ${alpha(theme.palette.background.default, 0.85)}, ${alpha(theme.palette.primary.light, 0.28)})`,
        borderRadius: 5,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        boxShadow: `0 45px 90px ${alpha(theme.palette.primary.main, 0.2)}`,
        px: { xs: 3, md: 6 },
        py: { xs: 4, md: 6 },
        backdropFilter: 'blur(22px)',
      })}
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
            <Box
              sx={(theme) => ({
                height: '100%',
                borderRadius: 4,
                p: { xs: 3, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                background: `linear-gradient(150deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.primary.light, 0.25)})`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                boxShadow: `0 28px 60px ${alpha(theme.palette.primary.main, 0.18)}`,
                backdropFilter: 'blur(18px)',
              })}
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
                <Stack spacing={1}>
                  <Button variant="text" size="small" sx={{ px: 0, alignSelf: 'flex-start' }}>Forgot password?</Button>
                  <Alert severity="info" sx={{ borderRadius: 2, bgcolor: 'transparent', border: `1px solid`, borderColor: 'primary.light' }}>
                    Accounts are created by the Student Administrative Office. Contact admin-office@brillaracademy.edu to request
                    access.
                  </Alert>
                </Stack>
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12} md={7}>
            <Box
              sx={(theme) => ({
                borderRadius: 4,
                p: { xs: 3, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                background: `linear-gradient(150deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.secondary.light, 0.25)})`,
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}`,
                boxShadow: `0 28px 60px ${alpha(theme.palette.secondary.main, 0.18)}`,
                backdropFilter: 'blur(18px)',
              })}
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
                        width: { xs: '100%', sm: 'auto' },
                        borderColor: 'secondary.light',
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
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
