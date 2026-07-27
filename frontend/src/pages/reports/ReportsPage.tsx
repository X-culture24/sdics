import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  BarChart as PerfIcon,
  PeopleAlt as CitizensIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/api/reports';
import { adminUnitsApi } from '@/services/api/users';
import { campaignsApi } from '@/services/api/campaign';

const CardWrapper: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <Card>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: (t) => `${t.palette.primary.main}15`,
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={2}>{children}</Stack>
    </CardContent>
  </Card>
);

const ReportsPage: React.FC = () => {
  const [citizens, setCitizens] = useState({
    format: 'csv' as 'csv' | 'xlsx',
    level: 2,
    countyId: '',
    districtId: '',
    divisionId: '',
    locationId: '',
    regStatus: '',
  });
  const [perf, setPerf] = useState({ format: 'csv' as 'csv' | 'xlsx', level: 3 });
  const [campaignId, setCampaignId] = useState('');
  const [campaignFormat, setCampaignFormat] = useState<'csv' | 'xlsx'>('csv');

  const adminUnits = useQuery({
    queryKey: ['admin-units-report'],
    queryFn: async () => (await adminUnitsApi.list({ pageSize: 9999 })).data,
    staleTime: 60_000,
  });
  const campaigns = useQuery({
    queryKey: ['campaigns-report'],
    queryFn: async () => (await campaignsApi.list({ pageSize: 100 })).data,
  });

  const byLevel = (lvl: number) => (adminUnits.data ?? []).filter((u) => u.level === lvl);
  const childrenOf = (level: number, parentId?: string) =>
    (adminUnits.data ?? []).filter(
      (u) => u.level === level && (parentId ? u.parentId === parentId : true),
    );

  const exportCitizens = useMutation({
    mutationFn: () =>
      reportsApi.exportCitizens({
        ...citizens,
        countyId: citizens.countyId || undefined,
        districtId: citizens.districtId || undefined,
        divisionId: citizens.divisionId || undefined,
        locationId: citizens.locationId || undefined,
        registrationStatus: citizens.regStatus || undefined,
      } as any),
  });
  const exportPerf = useMutation({
    mutationFn: () => reportsApi.performanceReport(perf),
  });
  const exportCampaign = useMutation({
    mutationFn: () => reportsApi.campaignReport(campaignId as any, campaignFormat),
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
          Reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate exports and regional reports — all calculations performed by the backend.
        </Typography>
      </Box>

      {(exportCitizens.isError || exportPerf.isError || exportCampaign.isError) && (
        <Alert severity="warning">
          Report generation failed. Verify network connection and backend health.
        </Alert>
      )}
      {exportCitizens.isSuccess || exportPerf.isSuccess || exportCampaign.isSuccess ? (
        <Alert severity="success">Report downloaded successfully.</Alert>
      ) : null}

      <Grid container spacing={2.5}>
        <Grid xs={12} md={6}>
          <CardWrapper
            icon={<CitizensIcon fontSize="small" />}
            title="Citizens Export"
            description="Export citizen registers as CSV or Excel."
          >
            <Grid container spacing={1.5}>
              <Grid xs={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    label="Format"
                    value={citizens.format}
                    onChange={(e) => setCitizens({ ...citizens, format: e.target.value as any })}
                  >
                    <MenuItem value="csv">CSV (.csv)</MenuItem>
                    <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={6}>
                <TextField
                  size="small"
                  label="Registration Status"
                  select
                  fullWidth
                  value={citizens.regStatus}
                  onChange={(e) => setCitizens({ ...citizens, regStatus: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Registered">Registered</MenuItem>
                  <MenuItem value="Unregistered">Not Registered</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Ineligible">Ineligible</MenuItem>
                </TextField>
              </Grid>
              <Grid xs={6}>
                <TextField
                  size="small"
                  label="County"
                  select
                  fullWidth
                  value={citizens.countyId}
                  onChange={(e) =>
                    setCitizens({
                      ...citizens,
                      countyId: e.target.value,
                      districtId: '',
                      divisionId: '',
                      locationId: '',
                    })
                  }

                >
                  <MenuItem value="">All counties</MenuItem>
                  {byLevel(2).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid xs={6}>
                <TextField
                  size="small"
                  label="District / Sub-county"
                  select
                  fullWidth
                  value={citizens.districtId}
                  onChange={(e) =>
                    setCitizens({ ...citizens, districtId: e.target.value, divisionId: '', locationId: '' })
                  }
                >
                  <MenuItem value="">All districts</MenuItem>
                  {childrenOf(3, citizens.countyId).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid xs={6}>
                <TextField
                  size="small"
                  label="Division"
                  select
                  fullWidth
                  value={citizens.divisionId}
                  onChange={(e) => setCitizens({ ...citizens, divisionId: e.target.value, locationId: '' })}
                >
                  <MenuItem value="">All divisions</MenuItem>
                  {childrenOf(4, citizens.districtId).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid xs={6}>
                <TextField
                  size="small"
                  label="Location"
                  select
                  fullWidth
                  value={citizens.locationId}
                  onChange={(e) => setCitizens({ ...citizens, locationId: e.target.value })}
                >
                  <MenuItem value="">All locations</MenuItem>
                  {childrenOf(5, citizens.divisionId).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              fullWidth
              startIcon={
                exportCitizens.isPending ? (
                  <CircularProgress size={18} />
                ) : (
                  <DownloadIcon />
                )
              }
              onClick={() => exportCitizens.mutate()}
              disabled={exportCitizens.isPending}
            >
              {exportCitizens.isPending ? 'Generating report...' : 'Download Citizen Report'}
            </Button>
          </CardWrapper>
        </Grid>

        <Grid xs={12} md={6}>
          <CardWrapper
            icon={<PerfIcon fontSize="small" />}
            title="Performance Report"
            description="Regional progress table at any administrative level."
          >
            <Grid container spacing={1.5}>
              <Grid xs={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    label="Format"
                    value={perf.format}
                    onChange={(e) => setPerf({ ...perf, format: e.target.value as any })}
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="xlsx">Excel</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={6}>
                <TextField
                  size="small"
                  label="Hierarchy Level"
                  select
                  fullWidth
                  value={perf.level}
                  onChange={(e) => setPerf({ ...perf, level: Number(e.target.value) })}
                >
                  <MenuItem value={2}>Counties</MenuItem>
                  <MenuItem value={3}>Districts</MenuItem>
                  <MenuItem value={4}>Divisions</MenuItem>
                  <MenuItem value={5}>Locations</MenuItem>
                  <MenuItem value={6}>Sub-locations</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={
                exportPerf.isPending ? <CircularProgress size={18} /> : <DownloadIcon />
              }
              onClick={() => exportPerf.mutate()}
              disabled={exportPerf.isPending}
            >
              {exportPerf.isPending ? 'Generating...' : 'Download Performance Report'}
            </Button>
          </CardWrapper>
        </Grid>

        <Grid xs={12} md={6}>
          <CardWrapper
            icon={<CampaignIcon fontSize="small" />}
            title="Campaign Report"
            description="All registrations performed for a campaign."
          >
            <Grid container spacing={1.5}>
              <Grid xs={8}>
                <TextField
                  size="small"
                  label="Campaign"
                  select
                  fullWidth
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}

                >
                  <MenuItem value="">Select campaign...</MenuItem>
                  {(campaigns.data ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} · {c.status}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid xs={4}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    label="Format"
                    value={campaignFormat}
                    onChange={(e) => setCampaignFormat(e.target.value as any)}
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="xlsx">Excel</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              color="warning"
              fullWidth
              startIcon={
                exportCampaign.isPending ? <CircularProgress size={18} /> : <DownloadIcon />
              }
              onClick={() => exportCampaign.mutate()}
              disabled={exportCampaign.isPending || !campaignId}
            >
              {exportCampaign.isPending ? 'Generating...' : 'Download Campaign Report'}
            </Button>
          </CardWrapper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default ReportsPage;
