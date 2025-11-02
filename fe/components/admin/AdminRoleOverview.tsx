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
            sx={(theme) => ({
              borderRadius: 4,
              p: { xs: 3, md: 4 },
              height: '100%',
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.primary.light, 0.25)})`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
              boxShadow: `0 24px 60px ${alpha(theme.palette.primary.main, 0.18)}`,
              backdropFilter: 'blur(16px)',
              display: 'flex',
            })}
          >
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={role.title}
                  color="primary"
                  sx={(theme) => ({
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.dark,
                    borderRadius: 999,
                  })}
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
