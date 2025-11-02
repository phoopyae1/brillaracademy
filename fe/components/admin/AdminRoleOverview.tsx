'use client';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

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
          <Box
            sx={{
              p: { xs: 3, md: 4 },
              height: '100%',
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.08)',
              display: 'flex',
            }}
          >
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={role.title}
                  color="primary"
                  sx={{
                    fontWeight: 600,
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {role.description}
              </Typography>
              <Divider sx={{ borderStyle: 'dashed', borderColor: 'primary.light', opacity: 0.4 }} />
              <Stack spacing={1.5}>
                {role.highlights.map((highlight) => (
                  <Typography key={highlight} variant="body2">
                    • {highlight}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
