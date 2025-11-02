'use client';

import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import { SvgIconComponent } from '@mui/icons-material';
import ShieldIcon from '@mui/icons-material/Shield';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BarChartIcon from '@mui/icons-material/BarChart';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ForumIcon from '@mui/icons-material/Forum';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DescriptionIcon from '@mui/icons-material/Description';
import TimelineIcon from '@mui/icons-material/Timeline';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Feature } from '@/lib/features';

const iconMap: Record<string, SvgIconComponent> = {
  shield: ShieldIcon,
  dashboard: DashboardIcon,
  menu_book: MenuBookIcon,
  assignment_turned_in: AssignmentTurnedInIcon,
  bar_chart: BarChartIcon,
  event_available: EventAvailableIcon,
  forum: ForumIcon,
  account_balance_wallet: AccountBalanceWalletIcon,
  description: DescriptionIcon,
  timeline: TimelineIcon,
  rocket_launch: RocketLaunchIcon,
  admin_panel_settings: AdminPanelSettingsIcon,
  auto_awesome: AutoAwesomeIcon
};

type Props = {
  features: Feature[];
};

export default function FeatureGrid({ features }: Props) {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {features.map((feature) => {
        const Icon = iconMap[feature.icon] ?? AutoAwesomeIcon;

        return (
          <Grid item xs={12} md={6} lg={4} key={feature.id}>
            <Box
              sx={{
                height: '100%',
                p: { xs: 3, md: 4 },
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid',
                borderColor: 'rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                '&:hover': {
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                  }}
                >
                  <Icon />
                </Avatar>
                <Stack spacing={0.5}>
                  <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1 }}>
                    {feature.category}
                  </Typography>
                  <Typography variant="h5">{feature.name}</Typography>
                </Stack>
              </Stack>
              <Typography variant="body1">{feature.description}</Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
