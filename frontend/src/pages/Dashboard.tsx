import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  GroupAdd as GroupAddIcon,
  HowToVote as VoteIcon,
  Flag as FlagIcon,
  Today as TodayIcon,
  TrendingUp as TrendingUpIcon,
  EventBusy as EventBusyIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Numbers as NumbersIcon,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  Line,
  LineChart,
  PieChart,
  Pie,
  ReferenceLine,
} from 'recharts';
import { dashboardApi } from '@/services/api/dashboard';
import { dashboardApi as dApi } from '@/services/api/dashboard';
import { formatNumber, formatPercent, formatDate, daysBetween } from '@/utils/format';
import { DataTable } from '@/components/DataTable';
import type { ColDef } from '@/components/DataTable';
import type { Campaign, PerformanceTableRow } from '@/types/dto';

const KpiCard: React.FC<{
  icon: React.ComponentType<any>;
  color: 'primary' | 'secondary' | 'warning' | 'info' | 'error' | 'success';
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  progress?: number;
  info?: string;
  right?: React.ReactNode;
}> = ({ icon: Icon, color, label, value, sub, progress, info, right }) => {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'visible',
        height: '100%',
        borderLeft: '4px solid',
        borderLeftColor: (t) =>
          ({
            primary: t.palette.primary.main,
            secondary: t.palette.secondary.main,
            warning: t.palette.warning.main,
            info: t.palette.info.main,
            error: t.palette.error.main,
            success: t.palette.success.main,
          })[color],
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  p: 1.1,
                  borderRadius: 2.5,
                  bgcolor: (t) =>
                    ({
                      primary: 'rgba(10, 37, 64, 0.1)',
                      secondary: 'rgba(14, 124, 59, 0.12)',
                      warning: 'rgba(245, 158, 11, 0.12)',
                      info: 'rgba(37, 99, 235, 0.12)',
                      error: 'rgba(220, 38, 38, 0.12)',
                      success: 'rgba(14, 124, 59, 0.12)',
                    }[color] as string),
                  color: `${color}.main`,
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.2 }}>
                  {label.toUpperCase()}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.25}>
              {right}
              {info ? (
                <Tooltip title={info} placement="top">
                  <IconButton size="small" color="inherit" sx={{ color: 'text.secondary' }}>
                    <InfoIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          </Stack>

          <Stack spacing={0.75}>
            <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {value}
            </Typography>
            {sub !== undefined && sub !== null ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {sub}
              </Typography>
            ) : null}
            {typeof progress === 'number' && !Number.isNaN(progress) ? (
              <Box sx={{ pt: 0.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, progress))}
                  color={
                    ({
                      primary: 'primary',
                      secondary: 'success',
                      warning: 'warning',
                      info: 'info',
                      error: 'error',
                      success: 'success',
                    } as const)[color]
                  }
                />
              </Box>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [campaignId, setCampaignId] = React.useState<string>('');

  const campaigns = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: async () => {
      try {
        const { campaignsApi } = await import('@/services/api/campaign');
        const res = await campaignsApi.list({ pageSize: 50 });
        return res.data;
      } catch {
        return [] as Campaign[];
      }
    },
    staleTime: 60_000,
  });

  const kpis = useQuery({
    queryKey: ['kpi', campaignId],
    queryFn: () =>
      dApi.kpis(campaignId ? { campaignId: campaignId as any } : undefined),
    refetchInterval: 15_000,
  });

  const district = useQuery({
    queryKey: ['district-perf', campaignId],
    queryFn: () =>
      dashboardApi.districtPerformance(campaignId ? { campaignId: campaignId as any } : undefined),
  });

  const trend = useQuery({
    queryKey: ['trend', campaignId],
    queryFn: () =>
      dashboardApi.registrationTrend({ days: 30, campaignId: campaignId ? (campaignId as any) : undefined }),
  });

  const table = useQuery({
    queryKey: ['perf-table', campaignId],
    queryFn: () =>
      dashboardApi.performanceTable({ level: 3, campaignId: campaignId ? (campaignId as any) : undefined }),
  });

  const pieData = useMemo(() => {
    if (!kpis.data) return [];
    return [
      { name: 'Registered', value: kpis.data.registeredVoters },
      { name: 'Not Registered', value: kpis.data.nationalIdsNotRegistered },
    ];
  }, [kpis.data]);

  const districtChartData = (district.data?.data ?? []).slice(0, 14);
  const activeCampaign = (campaigns.data ?? []).find((campaign) => campaign.status === 'Active') ?? campaigns.data?.[0];

  const pieColors = [theme.palette.secondary.main, theme.palette.warning.main];

  const colDefs: ColDef<PerformanceTableRow>[] = useMemo(
    () => [
      {
        field: 'name',
        header: 'District / Division',
        minWidth: 200,
        render: (r) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: (t) => `${t.palette.primary.main}20`,
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlagIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {r.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.parentName || 'L' + r.level}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        field: 'adultPopulation',
        header: 'Adult Population',
        align: 'right',
        render: (r) => <Typography variant="body2">{formatNumber(r.adultPopulation)}</Typography>,
      },
      {
        field: 'registered',
        header: 'Registered',
        align: 'right',
        render: (r) => <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>{formatNumber(r.registered)}</Typography>,
      },
      {
        field: 'remaining',
        header: 'Remaining IDs',
        align: 'right',
        render: (r) => <Typography variant="body2">{formatNumber(r.remaining)}</Typography>,
      },
      {
        field: 'progressPercent',
        header: 'Progress',
        minWidth: 180,
        render: (r) => (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.75}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {formatPercent(r.progressPercent)}
              </Typography>
              <Chip
                label={
                  r.progressPercent >= 80
                    ? 'On Track'
                    : r.progressPercent >= 50
                    ? 'In Progress'
                    : 'Behind'
                }
                size="small"
                variant="outlined"
                color={
                  r.progressPercent >= 80
                    ? 'success'
                    : r.progressPercent >= 50
                    ? 'warning'
                    : 'error'
                }
                sx={{ fontWeight: 700, fontSize: 10, height: 20 }}
              />
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, r.progressPercent))}
              color={r.progressPercent >= 80 ? 'success' : r.progressPercent >= 50 ? 'warning' : 'error'}
            />
          </Box>
        ),
      },
    ],
    [],
  );

  const totalErr = kpis.isError || district.isError || trend.isError || table.isError;

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            Campaign Management Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor registration progress, campaign targets, and administrative performance.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="campaign-select-label">Active Campaign</InputLabel>
            <Select
              labelId="campaign-select-label"
              label="Active Campaign"
              value={campaignId}
              onChange={(e: SelectChangeEvent) => setCampaignId(e.target.value)}
            >
              <MenuItem value="">Auto-detect active</MenuItem>
              {(campaigns.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <span>{c.name}</span>
                    <Chip
                      size="small"
                      label={c.status}
                      color={
                        c.status === 'Active' ? 'success' : c.status === 'Draft' ? 'default' : 'info'
                      }
                      variant="outlined"
                    />
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh dashboard">
            <IconButton
              onClick={() => {
                kpis.refetch();
                district.refetch();
                trend.refetch();
                table.refetch();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {totalErr ? (
        <Alert severity="warning">
          Some dashboard metrics couldn't be loaded. Please refresh the dashboard.
        </Alert>
      ) : null}

      <Card sx={{ borderLeft: '4px solid', borderLeftColor: 'secondary.main' }}>
        <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
            <InfoIcon color="success" fontSize="small" />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Campaign Information
            </Typography>
          </Stack>
          <Grid container rowSpacing={2.5} columnSpacing={4}>
            <Grid xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">ACTIVE CAMPAIGN</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.35 }}>
                {activeCampaign?.name ?? 'No active campaign'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeCampaign?.description || 'Select a campaign to review its progress.'}
              </Typography>
            </Grid>
            <Grid xs={6} md={2.5}>
              <Typography variant="caption" color="text.secondary">CAMPAIGN PERIOD</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.35 }}>
                {activeCampaign ? `${formatDate(activeCampaign.startDate)} – ${formatDate(activeCampaign.endDate)}` : '—'}
              </Typography>
            </Grid>
            <Grid xs={6} md={2}>
              <Typography variant="caption" color="text.secondary">STATUS</Typography>
              <Box sx={{ mt: 0.45 }}>
                <Chip size="small" color={activeCampaign?.status === 'Active' ? 'success' : 'default'} label={activeCampaign?.status ?? 'Not configured'} />
              </Box>
            </Grid>
            <Grid xs={12} md={3.5}>
              <Typography variant="caption" color="text.secondary">REGISTRATION PROGRESS</Typography>
              <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 800, mt: 0.2 }}>
                {formatPercent(kpis.data?.overallProgressPercent ?? 0)}
              </Typography>
              <LinearProgress variant="determinate" color="success" value={Math.max(0, Math.min(100, kpis.data?.overallProgressPercent ?? 0))} sx={{ mt: 0.75 }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>System Overview</Typography>
        <Typography variant="body2" color="text.secondary">A live summary of voter registration activity.</Typography>
      </Box>

      {/* KPI Row */}
      {kpis.isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} xs={12} sm={6} lg={4}>
              <Card sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="caption" color="text.secondary">
                      Loading KPI...
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2.5}>
          <Grid xs={12} sm={6} lg={4}>
            <KpiCard
              icon={GroupAddIcon}
              color="warning"
              label="National IDs Not Registered"
              value={formatNumber(kpis.data?.nationalIdsNotRegistered ?? 0)}
              sub={`${formatPercent(
                kpis.data?.adultPopulation
                  ? (kpis.data!.nationalIdsNotRegistered / kpis.data!.adultPopulation) * 100
                  : 0,
              )} of adult population`}
              info="All citizens with National IDs but not yet registered as voters in this campaign."
            />
          </Grid>
          <Grid xs={12} sm={6} lg={4}>
            <KpiCard
              icon={VoteIcon}
              color="secondary"
              label="Registered Voters"
              value={formatNumber(kpis.data?.registeredVoters ?? 0)}
              sub={`${formatPercent(kpis.data?.overallProgressPercent ?? 0)} of adult population`}
              progress={kpis.data?.overallProgressPercent}
            />
          </Grid>
          <Grid xs={12} sm={6} lg={4}>
            <KpiCard
              icon={NumbersIcon}
              color="primary"
              label="Adult Population"
              value={formatNumber(kpis.data?.adultPopulation ?? 0)}
              sub={kpis.data?.activeCampaignName ? `Campaign: ${kpis.data.activeCampaignName}` : 'No active campaign'}
            />
          </Grid>
          <Grid xs={12} sm={6} lg={4}>
            <KpiCard
              icon={TodayIcon}
              color="info"
              label="Today's Target"
              value={formatNumber(kpis.data?.todaysTarget ?? 0)}
              sub="Remaining IDs ÷ Remaining Working Days"
            />
          </Grid>
          <Grid xs={12} sm={6} lg={4}>
            <KpiCard
              icon={TrendingUpIcon}
              color="success"
              label="Today's Progress"
              value={formatNumber(kpis.data?.todaysProgress ?? 0)}
              sub={
                kpis.data?.todaysTarget && kpis.data!.todaysTarget > 0
                  ? `${formatPercent((kpis.data!.todaysProgress / kpis.data!.todaysTarget) * 100)} of today's target`
                  : 'No target set yet'
              }
              progress={
                kpis.data?.todaysTarget && kpis.data!.todaysTarget > 0
                  ? (kpis.data!.todaysProgress / kpis.data!.todaysTarget) * 100
                  : 0
              }
            />
          </Grid>
          <Grid xs={12} sm={6} lg={4}>
            <KpiCard
              icon={EventBusyIcon}
              color="primary"
              label="Remaining Working Days"
              value={`${kpis.data?.remainingWorkingDays ?? 0} days`}
              sub={`Out of ${kpis.data?.totalWorkingDays ?? 0} total working days · excl. weekends`}
              progress={
                kpis.data?.totalWorkingDays && kpis.data!.totalWorkingDays > 0
                  ? ((kpis.data!.totalWorkingDays - kpis.data!.remainingWorkingDays) / kpis.data!.totalWorkingDays) * 100
                  : 0
              }
              right={
                <Chip
                  size="small"
                  label={`${kpis.data?.initialTarget ?? 0} initial`}
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 700 }}
                />
              }
            />
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={2.5}>
        <Grid xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Registration Trend · Last 30 Days
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Daily new registrations across all regions
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={trend.isLoading ? 'Loading' : `Days: ${trend.data?.days ?? 30}`}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 320, width: '100%' }}>
                {trend.isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <CircularProgress />
                  </Stack>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend.data?.data ?? []} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        stroke={theme.palette.text.secondary}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
                      <RTooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: theme.shadows[2],
                        }}
                      />
                      <Legend />
                      <ReferenceLine
                        y={kpis.data?.todaysTarget ?? 0}
                        stroke={theme.palette.primary.main}
                        strokeDasharray="5 5"
                        label={{ value: "Today's Target", fill: theme.palette.primary.main, fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="registered"
                        name="Registered"
                        stroke={theme.palette.secondary.main}
                        strokeWidth={3}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                        fill={`${theme.palette.secondary.main}22`}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} lg={5}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    District Performance · Top 14
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Registrations by administrative district
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 320, width: '100%' }}>
                {district.isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <CircularProgress />
                  </Stack>
                ) : districtChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={districtChartData}
                      margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        stroke={theme.palette.text.secondary}
                        width={100}
                      />
                      <RTooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: theme.shadows[2],
                        }}
                      />
                      <Legend />
                      <Bar dataKey="adultPopulation" name="Adult Pop." fill={theme.palette.primary.light} radius={[0, 6, 6, 0]} />
                      <Bar dataKey="registered" name="Registered" fill={theme.palette.secondary.main} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      No district data yet
                    </Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={5} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Overall Registration Analysis
              </Typography>
              <Typography variant="caption" color="text.secondary" mb={2} display="block">
                Registered voters as a share of the total adult population
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 260, width: '100%' }}>
                {kpis.isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <CircularProgress />
                  </Stack>
                ) : (
                  <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: '100%' }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={100}
                        size={172}
                        thickness={4}
                        sx={{ color: (t) => `${t.palette.secondary.main}24` }}
                      />
                      <CircularProgress
                        variant="determinate"
                        value={Math.max(0, Math.min(100, kpis.data?.overallProgressPercent ?? 0))}
                        size={172}
                        thickness={4}
                        color="success"
                        sx={{ position: 'absolute', left: 0 }}
                      />
                      <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ position: 'absolute', inset: 0 }}
                      >
                        <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
                          {formatPercent(kpis.data?.overallProgressPercent ?? 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">complete</Typography>
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={2.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Registered</Typography>
                        <Typography variant="subtitle2" color="secondary.main" sx={{ fontWeight: 700 }}>
                          {formatNumber(kpis.data?.registeredVoters ?? 0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Remaining</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {formatNumber(kpis.data?.nationalIdsNotRegistered ?? 0)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={7} lg={9}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Performance Table · Districts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Progress, registered count and remaining IDs per region
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <DataTable
                rows={table.data?.data ?? []}
                columns={colDefs}
                loading={table.isLoading}
                getRowId={(r) => r.id}
                searchPlaceholder="Search district/division..."
                searchFields={['name', 'parentName']}
                pageSize={10}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default Dashboard;
