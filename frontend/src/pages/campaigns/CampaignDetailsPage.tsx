import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Flag as FlagIcon,
  Numbers as NumbersIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  HowToReg as RegIcon,
} from '@mui/icons-material';
import { campaignsApi } from '@/services/api/campaign';
import { dashboardApi } from '@/services/api/dashboard';
import { reportsApi } from '@/services/api/reports';
import { CAMPAIGN_STATUSES } from '@/constants';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';
import { useMutation } from '@tanstack/react-query';

const CampaignDetailsPage: React.FC = () => {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const cam = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.get(id as any),
    enabled: !!id,
  });
  const stats = useQuery({
    queryKey: ['campaign-stats', id],
    queryFn: () => campaignsApi.stats(id as any),
    enabled: !!id,
  });
  const perf = useQuery({
    queryKey: ['campaign-perf', id],
    queryFn: () =>
      dashboardApi.performanceTable({
        level: 3,
        campaignId: id as any,
      }),
    enabled: !!id,
  });
  const download = useMutation({
    mutationFn: (format: 'csv' | 'xlsx') => reportsApi.campaignReport(id as any, format),
  });

  if (cam.isLoading)
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 360 }}>
        <CircularProgress />
      </Stack>
    );

  if (cam.isError || !cam.data) {
    return <Alert severity="error">Campaign not found.</Alert>;
  }

  const c = cam.data;
  const m = CAMPAIGN_STATUSES.find((s) => s.value === c.status);
  const remaining = (c.initialNIDCount ?? 0) - (stats.data?.totalRegistered ?? 0);
  const pct = c.initialNIDCount ? ((stats.data?.totalRegistered ?? 0) / c.initialNIDCount) * 100 : 0;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton color="inherit" onClick={() => nav('/campaigns')}>
            <BackIcon />
          </IconButton>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                p: 1,
                borderRadius: 2.5,
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlagIcon fontSize="small" />
            </Box>
            <Box minWidth={0}>
              <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }} noWrap>
                {c.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={m?.label ?? c.status}
                  color={(m?.color ?? 'default') as any}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(c.startDate)} → {formatDate(c.endDate)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Tooltip title="Download CSV">
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => download.mutate('csv')}
              disabled={download.isPending}
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip title="Download Excel">
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => download.mutate('xlsx')}
              disabled={download.isPending}
            >
              Excel
            </Button>
          </Tooltip>
          {c.status !== 'Active' ? (
            <Button variant="contained" color="success" size="small" startIcon={<PlayIcon />}>
              Activate
            </Button>
          ) : (
            <Button variant="contained" color="warning" size="small" startIcon={<PauseIcon />}>
              Pause
            </Button>
          )}
        </Stack>
      </Stack>

      <Grid container spacing={2.5}>
        {[
          {
            label: 'Initial NID Target',
            value: formatNumber(c.initialNIDCount ?? 0),
            color: 'primary',
            icon: <NumbersIcon fontSize="small" />,
          },
          {
            label: 'Registered Voters',
            value: formatNumber(stats.data?.totalRegistered ?? 0),
            color: 'success',
            icon: <RegIcon fontSize="small" />,
          },
          {
            label: 'Remaining IDs',
            value: formatNumber(Math.max(0, remaining)),
            color: 'warning',
            icon: <FlagIcon fontSize="small" />,
          },
          {
            label: 'Completion',
            value: formatPercent(pct),
            color: pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error',
            icon: <FlagIcon fontSize="small" />,
          },
        ].map((k) => (
          <Grid key={k.label} xs={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      p: 0.85,
                      borderRadius: 2,
                      color: `${k.color}.main`,
                      bgcolor: (t) => `${t.palette[k.color as 'primary'].main}18`,
                    }}
                  >
                    {k.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {k.label.toUpperCase()}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }} noWrap>
                      {k.value}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                District performance in this campaign
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box>
                {(perf.data?.data ?? []).slice(0, 12).map((d) => (
                  <Stack key={d.id} spacing={0.5} sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                        {d.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatNumber(d.registered)} / {formatNumber(d.adultPopulation)} ·{' '}
                        {formatPercent(d.progressPercent)}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 99,
                        bgcolor: (t) => t.palette.divider,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.max(0, Math.min(100, d.progressPercent))}%`,
                          height: '100%',
                          borderRadius: 99,
                          bgcolor:
                            d.progressPercent >= 80
                              ? (t: any) => t.palette.success.main
                              : d.progressPercent >= 50
                              ? (t: any) => t.palette.warning.main
                              : (t: any) => t.palette.error.main,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </Box>
                  </Stack>
                ))}
                {!perf.data?.data?.length && !perf.isLoading && (
                  <Typography variant="body2" color="text.secondary">
                    No district data yet.
                  </Typography>
                )}
                {perf.isLoading && <CircularProgress />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Campaign Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                {[
                  ['Created', formatDate(c.createdAt, true)],
                  ['Last Updated', formatDate(c.updatedAt, true)],
                  ['Created by ID', String(c.createdById ?? '—')],
                  ['Description', c.description ?? '—'],
                ].map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {k.toUpperCase()}
                    </Typography>
                    <Typography variant="body2" textAlign="right">
                      {v}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default CampaignDetailsPage;
