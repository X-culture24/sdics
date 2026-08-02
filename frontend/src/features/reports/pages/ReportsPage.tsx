import { Box, Card, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/api/dashboardService.ts';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';

export default function ReportsPage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardService.getKPIs(),
  });

  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['dashboard', 'performance'],
    queryFn: () => dashboardService.getDistrictPerformance(),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: () => dashboardService.getRegistrationTrend(),
  });

  const isLoading = kpisLoading || perfLoading || trendLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Reports & Analytics
      </Typography>

      {/* KPI Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              Total Registered
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#0056A6', my: 1 }}>
              {kpis?.registeredCount?.toLocaleString() || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#10B981' }}>
              ✓ Completed
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              Today's Target
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#F59E0B', my: 1 }}>
              {kpis?.todayTarget?.toLocaleString() || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              registrations needed
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              Today's Progress
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#8B5CF6', my: 1 }}>
              {kpis?.todayProgress?.toLocaleString() || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              completed today
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              Overall Progress
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#10B981', my: 1 }}>
              {kpis?.overallProgress}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              of campaign target
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2}>
        {/* District Performance Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              District Performance
            </Typography>
            {performance && performance.length > 0 ? (
              <BarChart
                data={performance.map((d: any) => ({
                  name: d.districtName,
                  registered: d.registeredCount,
                  target: d.targetCount,
                }))}
              />
            ) : (
              <Alert severity="info">No district data available</Alert>
            )}
          </Card>
        </Grid>

        {/* Registration Trend Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Registration Trend
            </Typography>
            {trend && trend.length > 0 ? (
              <LineChart
                data={trend.map((d: any) => ({
                  date: new Date(d.date).toLocaleDateString(),
                  count: d.count,
                }))}
              />
            ) : (
              <Alert severity="info">No trend data available</Alert>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
