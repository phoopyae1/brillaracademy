'use client';

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

export type RoleDefinition = {
  title: string;
  description: string;
  highlights: string[];
};

type Props = {
  roles: readonly RoleDefinition[];
};

export default function AdminRoleOverview({ roles }: Props) {
  return (
    <Grid container spacing={3}>
      {roles.map((role) => (
        <Grid item xs={12} md={4} key={role.title}>
          <Paper
            elevation={0}
            sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 }, height: '100%' }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={role.title} color="primary" sx={{ fontWeight: 600 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {role.description}
              </Typography>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack spacing={1}>
                {role.highlights.map((highlight) => (
                  <Typography key={highlight} variant="body2">
                    • {highlight}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
