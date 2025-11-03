"use client";

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';

import { selfRegisterStudent } from '@/lib/db';
import type { MajorSubjectCatalogEntry, Student } from '@/lib/db';

type StudentSelfRegistrationFormProps = {
  majors: MajorSubjectCatalogEntry[];
};

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function StudentSelfRegistrationForm({ majors }: StudentSelfRegistrationFormProps) {
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);

  const hasMajors = majors.length > 0;

  const availableSubjects = useMemo(() => {
    if (!selectedMajor) {
      return [] as string[];
    }

    const entry = majors.find((item) => item.major === selectedMajor);
    return entry?.subjects ?? [];
  }, [majors, selectedMajor]);

  const handleMajorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextMajor = event.target.value;
    setSelectedMajor(nextMajor);

    const nextSubjects = majors.find((item) => item.major === nextMajor)?.subjects ?? [];
    setSelectedSubjects((current) => current.filter((subject) => nextSubjects.includes(subject)));
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((current) => {
      if (current.includes(subject)) {
        return current.filter((item) => item !== subject);
      }

      return [...current, subject];
    });
  };

  const resetFeedback = () => {
    setFormStatus('idle');
    setMessage(null);
    setCreatedStudent(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!hasMajors) {
      setFormStatus('error');
      setMessage('Self-registration is currently unavailable.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get('firstName') ?? '').trim();
    const lastName = String(formData.get('lastName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!firstName || !lastName || !email || !password) {
      setFormStatus('error');
      setMessage('Please complete all required fields.');
      return;
    }

    if (!selectedMajor) {
      setFormStatus('error');
      setMessage('Select your major to continue.');
      return;
    }

    if (!selectedSubjects.length) {
      setFormStatus('error');
      setMessage('Choose at least one subject that aligns with your major.');
      return;
    }

    setFormStatus('submitting');
    setMessage(null);

    try {
      const student = await selfRegisterStudent({
        firstName,
        lastName,
        email,
        password,
        primaryInterest: selectedMajor,
        selectedSubjects
      });

      setCreatedStudent(student);
      setFormStatus('success');
      setMessage('Your student dashboard will be ready once you sign in. Check your email for a confirmation message.');
      setSelectedMajor('');
      setSelectedSubjects([]);
      event.currentTarget.reset();
    } catch (error: any) {
      const errorMessage = typeof error?.message === 'string' ? error.message : 'Unable to create your account right now.';
      setFormStatus('error');
      setMessage(errorMessage);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        {!hasMajors && (
          <Alert severity="warning">
            <AlertTitle>Self-registration is paused</AlertTitle>
            Our catalog of majors is unavailable right now. Please contact the Student Administrative Office for assistance.
          </Alert>
        )}

        {message && (
          <Alert severity={formStatus === 'success' ? 'success' : 'error'}>
            {formStatus === 'success' && createdStudent ? (
              <Stack spacing={1}>
                <AlertTitle>Welcome aboard, {createdStudent.firstName}!</AlertTitle>
                <Typography variant="body2" color="text.secondary">
                  {message}
                </Typography>
                {createdStudent.selectedSubjects?.length ? (
                  <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                    {createdStudent.selectedSubjects.map((subject) => (
                      <Typography component="li" variant="body2" key={subject}>
                        {subject}
                      </Typography>
                    ))}
                  </Box>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2">{message}</Typography>
            )}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField name="firstName" label="First name" fullWidth required autoComplete="given-name" disabled={formStatus === 'submitting'} />
          <TextField name="lastName" label="Last name" fullWidth required autoComplete="family-name" disabled={formStatus === 'submitting'} />
        </Stack>

        <TextField
          name="email"
          label="Academy email"
          type="email"
          fullWidth
          required
          autoComplete="email"
          disabled={formStatus === 'submitting'}
        />

        <TextField
          name="password"
          label="Create password"
          type="password"
          fullWidth
          required
          autoComplete="new-password"
          helperText="Passwords must be at least 6 characters."
          disabled={formStatus === 'submitting'}
        />

        <TextField
          select
          name="primaryInterest"
          label="Major"
          value={selectedMajor}
          onChange={handleMajorChange}
          fullWidth
          required
          disabled={!hasMajors || formStatus === 'submitting'}
          helperText={hasMajors ? 'This determines the subjects you can choose today.' : 'Reach out to the academy team for manual assistance.'}
        >
          <MenuItem value="">
            <em>Select your major</em>
          </MenuItem>
          {majors.map((major) => (
            <MenuItem key={major.major} value={major.major}>
              {major.major}
            </MenuItem>
          ))}
        </TextField>

        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Choose your first-term subjects</Typography>
          <Typography variant="body2" color="text.secondary">
            Pick the subjects that align with your selected major. You can refine your schedule from the student portal later.
          </Typography>

          {!selectedMajor && hasMajors ? (
            <Alert severity="info">Select a major to see the available subjects.</Alert>
          ) : null}

          {selectedMajor && availableSubjects.length === 0 ? (
            <Alert severity="warning">Subject selections for this major will open soon. Check back later.</Alert>
          ) : null}

          {selectedMajor && availableSubjects.length > 0 ? (
            <FormGroup>
              {availableSubjects.map((subject) => (
                <FormControlLabel
                  key={subject}
                  control={
                    <Checkbox
                      checked={selectedSubjects.includes(subject)}
                      onChange={() => toggleSubject(subject)}
                      disabled={formStatus === 'submitting'}
                    />
                  }
                  label={subject}
                />
              ))}
            </FormGroup>
          ) : null}
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={formStatus === 'submitting' || !hasMajors}
          startIcon={formStatus === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {formStatus === 'submitting' ? 'Creating account…' : 'Create my student account'}
        </Button>
      </Stack>
    </Box>
  );
}
