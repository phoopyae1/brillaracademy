"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as yup from 'yup';
import Image from 'next/image';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { authenticateStudent, adminLogin } from '@/lib/db';

type LoginMode = 'student' | 'staff';

const validationSchema = yup.object({
  email: yup
    .string()
    .email('Enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export default function LoginPageContent() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<LoginMode>('student');
  const [tabValue, setTabValue] = useState(0);
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      setSubmitError('');

      try {
        if (loginMode === 'student') {
          const student = await authenticateStudent(values.email.trim(), values.password);

          if (!student?.id) {
            setSubmitError('Invalid credentials or missing student profile.');
            setIsSubmitting(false);
            return;
          }

          const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
          const maxAgeSeconds = 60 * 60 * 24; // 24 hours

          // Set cookies
          document.cookie = `brillar_student_id=${student.id}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;

          if (fullName) {
            document.cookie = `brillar_student_name=${encodeURIComponent(fullName)}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
          }

          // Use window.location for a full page reload to ensure cookie is available on server
          setTimeout(() => {
            window.location.replace('/student-portal');
          }, 100);
          return;
        }

        // Both admin and staff use adminLogin - they're both staff accounts
        const staffSession = await adminLogin(values.email.trim(), values.password);

        if (!staffSession) {
          throw new Error('Invalid staff credentials or insufficient permissions.');
        }

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('brillar_staff_session', JSON.stringify(staffSession));
        }

        // Staff login - route based on role
        // Check if this is the super admin (roise@edu.com) or any admin role
        if (values.email.toLowerCase() === 'roise@edu.com' && staffSession.staff.role === 'IT_ADMIN') {
          // Super admin goes to admin portal
          setTimeout(() => {
            window.location.replace('/admin');
          }, 100);
        } else if (staffSession.staff.role === 'IT_ADMIN' || staffSession.staff.role === 'STUDENT_ADMIN') {
          // Any IT_ADMIN or STUDENT_ADMIN goes to admin portal
          setTimeout(() => {
            window.location.replace('/admin');
          }, 100);
        } else {
          // Other staff (teachers, etc.) go to forge portal
          setTimeout(() => {
            window.location.replace('/forge');
          }, 100);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error during login.';
        setSubmitError(message);
        setIsSubmitting(false);
      }
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setLoginMode(newValue === 0 ? 'student' : 'staff');
    setSubmitError('');
    formik.resetForm();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F6F8FB',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
            border: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.98)'
          }}
        >
          <Stack spacing={3}>
            <Box textAlign="center">
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Image
                  src="/assets/brillar-logo.png"
                  alt="Brillar Academy Logo"
                  width={120}
                  height={120}
                  style={{ objectFit: 'contain' }}
                />
              </Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Welcome back 👋
              </Typography>
              <Typography color="text.secondary">
                Sign in to continue exploring curated lessons, assignments, and your personalized learning dashboard. Staff can
                access the Forge portal to manage academic operations.
              </Typography>
            </Box>

            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }
              }}
            >
              <Tab label="Student Login" />
              <Tab label="Staff Login" />
            </Tabs>

            {submitError && (
              <Alert severity="error">
                {submitError}
              </Alert>
            )}

            <Box 
              component="form"
              onSubmit={formik.handleSubmit}
              noValidate
            >
              <Stack spacing={2.5}>
                <TextField 
                  name="email"
                  label="Email address" 
                  type="email" 
                  fullWidth 
                  required 
                  autoComplete="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
                <TextField
                  name="password"
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  autoComplete="current-password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password && formik.errors.password}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ py: 1.2 }}
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                  {isSubmitting
                    ? 'Logging in…'
                    : loginMode === 'student'
                      ? 'Log in as Student'
                      : 'Log in as Staff'}
                </Button>
              </Stack>
            </Box>

            <Divider>Need access?</Divider>

            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                New to Brillar Academy? Create your student account, choose your major, and pick your first subjects on our self
                registration page. Staff members can still reach out to the IT administrator for Forge access and provisioning
                support.
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Link href="/register" underline="hover">
                  Create a student account
                </Link>
                <Link href="/create" underline="hover">
                  Interested in building a new class?
                </Link>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
