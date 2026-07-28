import { Box, Grid, Card, Typography, CircularProgress, Button, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardService } from '@/services/api/dashboardService';
import dayjs from 'dayjs';

function KPICard({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
  return (
    <Card sx={{ p: 3, textAlign: 'center', backgroundColor: '#fff' }}>
      <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ color: '#0056A6', fontWeight: 700 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </Typography>
    </Card>
  );
}

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading, error: kpisError, refetch: refetchKPIs } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      try {
        return await dashboardService.getKPIs();
      } catch (err) {
        console.error('Error fetching KPIs:', err);
        throw err;
      }
    },
  });

  const { data: districtData, isLoading: districtLoading, error: districtError } = useQuery({
    queryKey: ['dashboard-districts'],
    queryFn: async () => {
      try {
        return await dashboardService.getDistrictPerformance();
      } catch (err) {
        console.error('Error fetching district data:', err);
        throw err;
      }
    },
  });

  const { data: trends, isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: async () => {
      try {
        return await dashboardService.getRegistrationTrend(undefined, 30);
      } catch (err) {
        console.error('Error fetching trends:', err);
        throw err;
      }
    },
  });

  if (kpisLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (kpisError || !kpis) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading dashboard data. Please try again.
        </Alert>
        <Button variant="contained" onClick={() => refetchKPIs()}>
          Retry
        </Button>
      </Box>
    );
  }

  const remaining = kpis?.initialNidCount ? kpis.initialNidCount - kpis.registeredCount : 0;
  const progressPercent = kpis ? (kpis.registeredCount / kpis.initialNidCount) * 100 : 0;
  
  let statusColor = '#DC2626';
  let statusLabel = 'Behind';
  if (progressPercent >= 80) {
    statusColor = '#16A34A';
    statusLabel = 'On Track';
  } else if (progressPercent >= 50) {
    statusColor = '#F59E0B';
    statusLabel = 'At Risk';
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h2" sx={{ fontSize: '2rem', fontWeight: 700 }}>
          Executive Dashboard
        </Typography>
        <Button variant="contained" onClick={() => refetchKPIs()}>
          Refresh
        </Button>
      </Box>

      {/* KPIs Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="IDs Remaining" value={remaining} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="Registered Voters" value={kpis?.registeredCount || 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="Today's Target" value={kpis?.todayTarget || 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="Today's Progress" value={kpis?.todayProgress || 0} />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Registration Trend (Last 30 Days)
            </Typography>
            {trendsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : trendsError ? (
              <Alert severity="warning">Error loading trend data</Alert>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB' }} />
                  <Line type="monotone" dataKey="count" stroke="#0056A6" strokeWidth={2} dot={{ fill: '#0056A6' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              District Performance
            </Typography>
            {districtLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : districtError ? (
              <Alert severity="warning">Error loading district data</Alert>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={(districtData || []).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="districtName" angle={-45} textAnchor="end" height={80} stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB' }} />
                  <Bar dataKey="registeredCount" fill="#0056A6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Status Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, textAlign: 'center', background: `linear-gradient(135deg, ${statusColor}20 0%, ${statusColor}10 100%)` }}>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
              Overall Progress
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, position: 'relative', width: 120, height: 120, mx: 'auto' }}>
              <Box
                sx={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  border: `4px solid #E5E7EB`,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  border: `4px solid ${statusColor}`,
                  borderRightColor: '#E5E7EB',
                  borderBottomColor: '#E5E7EB',
                  borderLeftColor: '#E5E7EB',
                  transform: `rotate(${(progressPercent / 100) * 360}deg)`,
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontWeight: 700,
                  color: '#1F2937',
                }}
              >
                {Math.round(progressPercent)}%
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: statusColor, mb: 1 }}>
              {statusLabel}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              {kpis?.registeredCount?.toLocaleString()} of {kpis?.initialNidCount?.toLocaleString()} registered
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
              Campaign Countdown
            </Typography>
            <Typography variant="h2" sx={{ color: '#0056A6', fontWeight: 700, mb: 1 }}>
              {kpis?.campaignDaysRemaining || 0}
            </Typography>
            <Typography variant="body1" sx={{ color: '#6B7280' }}>
              Days Remaining
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
              Last Synchronization
            </Typography>
            <Typography variant="body1" sx={{ color: '#1F2937', fontWeight: 600, mb: 1 }}>
              {kpis?.lastSyncTime ? dayjs(kpis.lastSyncTime).format('HH:mm:ss') : 'N/A'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              {kpis?.lastSyncTime ? dayjs(kpis.lastSyncTime).format('MMM DD, YYYY') : 'N/A'}
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
