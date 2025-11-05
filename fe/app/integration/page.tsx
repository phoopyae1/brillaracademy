"use client";

import { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

interface Integration {
  contextKey: string;
  iframe: string;
  createdAt: string;
  updatedAt?: string;
}

const integrationSchema = yup.object({
  contextKey: yup.string().required('Context key is required'),
  iframe: yup.string().required('Iframe is required'),
});

export default function IntegrationPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const form = useFormik({
    initialValues: {
      contextKey: '',
      iframe: '',
    },
    validationSchema: integrationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await fetch(`${DEFAULT_API_BASE_URL}/integration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contextKey: values.contextKey.trim(),
            iframe: values.iframe.trim(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save integration');
        }

        setSuccess('Integration saved successfully!');
        form.resetForm();
        await fetchIntegrations();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
  });

  const fetchIntegrations = async () => {
    try {
      const response = await fetch(`${DEFAULT_API_BASE_URL}/integration`);
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F6F8FB',
        py: { xs: 4, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4}>
          {/* Header */}
          <Box textAlign="center">
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
              <IntegrationInstructionsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h3" fontWeight={700}>
                Integration Management
              </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary">
              Create and manage widget integrations
            </Typography>
          </Box>

          {/* Form Card */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
            <Box sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Create Integration
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter context key and iframe to create a new integration
                  </Typography>
                </Box>

                {/* Alerts */}
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                {/* Form */}
                <Box component="form" onSubmit={form.handleSubmit}>
                  <Stack spacing={3}>
                    <TextField
                      name="contextKey"
                      label="Context Key"
                      fullWidth
                      required
                      value={form.values.contextKey}
                      onChange={form.handleChange}
                      onBlur={form.handleBlur}
                      error={form.touched.contextKey && Boolean(form.errors.contextKey)}
                      helperText={form.touched.contextKey && form.errors.contextKey}
                      placeholder="br_abc123..."
                    />
                    <TextField
                      name="iframe"
                      label="Iframe"
                      fullWidth
                      required
                      multiline
                      rows={4}
                      value={form.values.iframe}
                      onChange={form.handleChange}
                      onBlur={form.handleBlur}
                      error={form.touched.iframe && Boolean(form.errors.iframe)}
                      helperText={form.touched.iframe && form.errors.iframe}
                      placeholder="Enter iframe code or URL"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
                    >
                      {loading ? 'Saving...' : 'Save Integration'}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Paper>

          {/* Existing Integrations */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
            <Box sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Existing Integrations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View your saved integrations
                  </Typography>
                </Box>

                {integrations.length === 0 ? (
                  <Paper
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No integrations created yet. Create one above to get started.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={2}>
                    {integrations.map((integration) => (
                      <Grid item xs={12} key={integration.contextKey}>
                        <Card>
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ flex: 1 }}>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                      Context Key:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontFamily: 'monospace',
                                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1,
                                      }}
                                    >
                                      {integration.contextKey}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() => copyToClipboard(integration.contextKey, `key-${integration.contextKey}`)}
                                      color={copiedKey === `key-${integration.contextKey}` ? 'success' : 'default'}
                                    >
                                      {copiedKey === `key-${integration.contextKey}` ? (
                                        <CheckCircleIcon fontSize="small" />
                                      ) : (
                                        <ContentCopyIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </Stack>
                                </Box>
                                <Chip label="Active" color="success" size="small" />
                              </Stack>
                              <Divider />
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  Iframe:
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                  <TextField
                                    value={integration.iframe}
                                    fullWidth
                                    multiline
                                    rows={4}
                                    InputProps={{
                                      readOnly: true,
                                    }}
                                    sx={{
                                      '& .MuiInputBase-root': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                      },
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(integration.iframe, integration.contextKey)}
                                    color={copiedKey === integration.contextKey ? 'success' : 'default'}
                                    sx={{ mt: 1 }}
                                  >
                                    {copiedKey === integration.contextKey ? (
                                      <CheckCircleIcon />
                                    ) : (
                                      <ContentCopyIcon />
                                    )}
                                  </IconButton>
                                </Stack>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Created: {new Date(integration.createdAt).toLocaleString()}
                                {integration.updatedAt && ` • Updated: ${new Date(integration.updatedAt).toLocaleString()}`}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
