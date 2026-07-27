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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  HowToVote as VoteIcon,
  Flag as FlagIcon,
  Today as TodayIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  GroupAdd as GroupAddIcon,
  Percent as PercentIcon,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Cell,
} from 'recharts';
import { dashboardApi } from '@/services/api/dashboard';
import { formatNumber, formatPercent, formatDate } from '@/utils/format';
import type { Campaign } from '@/types/dto';

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  icon: React.ComponentType<any>;
  color: 'primary' | 'secondary' | 'warning' | 'info' | 'error' | 'success';
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  progress?: number;
}> = ({ icon: Icon, color, label, value, sub, progress }) => (
  <Card sx={{ height: '100%', borderLeft: '4px solid', borderLeftColor: `${color}.main` }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              p: 1.1,
              borderRadius: 2,
              bgcolor: `${color}.main`,
              opacity: 0.85,
              color: '#fff',
              display: 'flex',
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.3 }}>
            {label.toUpperCase()}
          </Typography>
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {sub}
          </Typography>
        )}
        {typeof progress === 'number' && !Number.isNaN(progress) && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, progress))}
            color={color === 'warning' || color === 'error' ? color : 'success'}
            sx={{ borderRadius: 4, height: 6 }}
          />
        )}
      </Stack>
    </CardContent>
  </Card>
);

// ── Progress colour helper ───────────────────────────────────────────────────
function progressColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 80) return 'success';
  if (pct >= 45) return 'warning';
  return 'error';
}

function progressLabel(pct: number) {
  if (pct >= 80) return { label: 'On Track', color: 'success' as const };
  if (pct >= 45) return { label: 'In Progress', color: 'warning' as const };
  if (pct >= 20) return { label: 'Behind', color: 'error' as const };
  return { label: 'Critical', color: 'error' as const };
}

// ── Dashboard ────────────────────────────────────────────────────────────────
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
    queryFn: () => dashboardApi.kpis(campaignId ? { campaignId: campaignId as any } : undefined),
    refetchInterval: 15_000,
  });

  const district = useQuery({
    queryKey: ['district-perf', campaignId],
    queryFn: () => dashboardApi.districtPerformance(campaignId ? { campaignId: campaignId as any } : undefined),
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

  const activeCampaign = (campaigns.data ?? []).find((c) => c.status === 'Active') ?? campaigns.data?.[0];

  // Bar chart data: district vs registered vs adult population
  const districtChartData = useMemo(
    () =>
      (district.data?.data ?? [])
        .slice(0, 12)
        .map((d: any) => ({
          name: d.name?.length > 14 ? d.name.slice(0, 13) + '…' : d.name,
          'Adult Pop.': d.adultPopulation,
          Registered: d.registered,
          Target: d.adultPopulation,
        })),
    [district.data],
  );

  const refetchAll = () => {
    kpis.refetch();
    district.refetch();
    trend.refetch();
    table.refetch();
  };

  const totalErr = kpis.isError || district.isError || trend.isError || table.isError;

  return (
    <Stack spacing={3}>
      {/* ── Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            Registration Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeCampaign
              ? `Campaign: ${activeCampaign.name} · ${formatDate(activeCampaign.startDate)} – ${formatDate(activeCampaign.endDate)}`
              : 'No active campaign'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Campaign</InputLabel>
            <Select
              label="Campaign"
              value={campaignId}
              onChange={(e: SelectChangeEvent) => setCampaignId(e.target.value)}
            >
              <MenuItem value="">Auto (active)</MenuItem>
              {(campaigns.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={refetchAll}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {totalErr && (
        <Alert severity="warning">Some metrics couldn't be loaded. Try refreshing.</Alert>
      )}

      {/* ── KPI Cards ── */}
      <Grid container spacing={2.5}>
        <Grid xs={12} sm={6} lg={3}>
          <KpiCard
            icon={GroupAddIcon}
            color="warning"
            label="IDs Not Registered (Target)"
            value={formatNumber(kpis.data?.nationalIdsNotRegistered ?? 0)}
            sub="People with National IDs not yet registered as voters"
          />
        </Grid>
        <Grid xs={12} sm={6} lg={3}>
          <KpiCard
            icon={TodayIcon}
            color="info"
            label="Today's Target"
            value={formatNumber(kpis.data?.todaysTarget ?? 0)}
            sub={
              kpis.data
                ? `${kpis.data.todaysProgress ?? 0} registered today · ${kpis.data.remainingWorkingDays} working days left`
                : 'Remaining ÷ Working Days'
            }
            progress={
              kpis.data?.todaysTarget && kpis.data.todaysTarget > 0
                ? ((kpis.data.todaysProgress ?? 0) / kpis.data.todaysTarget) * 100
                : 0
            }
          />
        </Grid>
        <Grid xs={12} sm={6} lg={3}>
          <KpiCard
            icon={PercentIcon}
            color="secondary"
            label="% Progress Overall"
            value={formatPercent(kpis.data?.overallProgressPercent ?? 0)}
            sub={`${formatNumber(kpis.data?.registeredVoters ?? 0)} of ${formatNumber(kpis.data?.adultPopulation ?? 0)} registered`}
            progress={kpis.data?.overallProgressPercent}
          />
        </Grid>
        <Grid xs={12} sm={6} lg={3}>
          <KpiCard
            icon={TrendingUpIcon}
            color="success"
            label="% Target Progress"
            value={
              kpis.data?.initialTarget && kpis.data.initialTarget > 0
                ? formatPercent(((kpis.data.registeredVoters ?? 0) / kpis.data.initialTarget) * 100)
                : '—'
            }
            sub={
              kpis.data?.initialTarget
                ? `${formatNumber(kpis.data.registeredVoters ?? 0)} out of ${formatNumber(kpis.data.initialTarget)} target`
                : 'No campaign target set'
            }
            progress={
              kpis.data?.initialTarget && kpis.data.initialTarget > 0
                ? ((kpis.data.registeredVoters ?? 0) / kpis.data.initialTarget) * 100
                : 0
            }
          />
        </Grid>
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2.5}>
        {/* District bar chart */}
        <Grid xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                District Registration vs Target
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Number registered per district against adult population
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 340 }}>
                {district.isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <CircularProgress />
                  </Stack>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={districtChartData}
                      margin={{ top: 10, right: 20, bottom: 40, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      />
                      <Legend verticalAlign="top" />
                      <Bar dataKey="Adult Pop." fill={theme.palette.primary.light} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Registered" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Registration trend */}
        <Grid xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Total Registered – Last 30 Days
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Daily new registrations trend
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 340 }}>
                {trend.isLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <CircularProgress />
                  </Stack>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trend.data?.data ?? []}
                      margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      />
                      <ReferenceLine
                        y={kpis.data?.todaysTarget ?? 0}
                        stroke={theme.palette.warning.main}
                        strokeDasharray="5 5"
                        label={{
                          value: "Today's Target",
                          fill: theme.palette.warning.main,
                          fontSize: 10,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="registered"
                        name="Registered"
                        stroke={theme.palette.secondary.main}
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Performance Table ── */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                District Performance Table
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Adult population, voter registration status and IDs not registered per district
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {[
                { color: theme.palette.success.main, label: '≥80% On Track' },
                { color: theme.palette.warning.main, label: '≥45% In Progress' },
                { color: theme.palette.error.main, label: '<45% Behind' },
              ].map((s) => (
                <Stack key={s.label} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {table.isLoading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>District</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Adult Population</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Voter Registered</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>IDs Not Registered</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Progress</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(table.data?.data ?? []).map((row: any) => {
                    const pct = row.progressPercent ?? 0;
                    const { label, color } = progressLabel(pct);
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: `${progressColor(pct)}.main`,
                                flexShrink: 0,
                              }}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {row.name}
                              </Typography>
                              {row.parentName && (
                                <Typography variant="caption" color="text.secondary">
                                  {row.parentName}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{formatNumber(row.adultPopulation)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>
                            {formatNumber(row.registered)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="warning.main">
                            {formatNumber(row.remaining)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {formatPercent(pct)}
                              </Typography>
                              <Chip
                                label={label}
                                size="small"
                                color={color}
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                              />
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.max(0, Math.min(100, pct))}
                              color={progressColor(pct)}
                              sx={{ borderRadius: 4, height: 5 }}
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(table.data?.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No data yet — datasets will populate after import completes.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Dashboard;
