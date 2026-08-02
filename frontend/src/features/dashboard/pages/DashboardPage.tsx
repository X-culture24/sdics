import { Box, Grid, Card, CardContent, Typography, CircularProgress, Button, FormControl, InputLabel, Select, MenuItem, Paper } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/services/api/client.ts'
import CitizensTable from '@/components/CitizensTable'
import ExportButton from '@/components/ExportButton'
import { datasetService } from '@/services/api/datasetService.ts'
import { useState } from 'react'

function KPICard({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
  return (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom sx={{ fontSize: '12px' }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [selectedCounty, setSelectedCounty] = useState<string>('')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')

  const normalizeCountyName = (value: string) => {
    if (!value) return ''
    return value
      ?.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[-_]/g, ' ')
      .trim()
  }

  const { data: datasetUploads = [] } = useQuery({
    queryKey: ['dataset-uploads'],
    queryFn: async () => {
      try {
        const response = await datasetService.listDatasets(1, 100)
        return response.data || []
      } catch (err) {
        console.error('Error loading dataset uploads:', err)
        return []
      }
    },
  })

  const { data: counties = [] } = useQuery({
    queryKey: ['admin-units', 'level-2'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin-units', { params: { level: 2 } })
        const allCounties = response.data?.data || []
        const uploadedCountyNames = new Set(
          datasetUploads
            .map((upload: any) => normalizeCountyName(upload.county || ''))
            .filter(Boolean)
        )

        const datasetCounties = uploadedCountyNames.size > 0
          ? Array.from(uploadedCountyNames)
          : [
              'Baringo', 'Bomet', 'Elgeyo-Marakwet', 'Kajiado', 'Kericho',
              'Nandi', 'Narok', 'Samburu', 'Uasin Gishu', 'West Pokot',
            ].map(normalizeCountyName)

        return allCounties.filter((county: any) =>
          datasetCounties.includes(normalizeCountyName(county.name || ''))
        )
      } catch (err) {
        console.error('Error loading counties:', err)
        return []
      }
    },
  })

  const { data: kpis, isLoading: kpisLoading, refetch } = useQuery({
    queryKey: ['dashboard-kpis', selectedCounty, selectedCampaign],
    queryFn: async () => {
      const response = await api.get('/dashboard/kpis', {
        params: {
          ...(selectedCounty ? { admin_unit_id: selectedCounty } : {}),
          ...(selectedCampaign ? { campaign_id: selectedCampaign } : {}),
        },
      })
      return response.data
    },
  })

  const selectedCountyName = counties.find((county: any) => county.id === selectedCounty)?.name || ''

  const { data: datasetSummary, isLoading: datasetSummaryLoading } = useQuery({
    queryKey: ['dataset-summary', selectedCounty],
    queryFn: async () => {
      if (!selectedCounty) {
        return null
      }

      try {
        console.log('DashboardPage: Fetching dataset summary for countyId:', selectedCounty)
        const response = await api.get('/datasets/records', {
          params: {
            county_id: selectedCounty,
            summary: true,
          },
        })
        console.log('DashboardPage: Dataset summary response:', response.data)
        return response.data
      } catch (err) {
        console.error('Error loading dataset summary:', err)
        return null
      }
    },
    enabled: !!selectedCounty,
  })

  const { data: trendsRaw, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends', selectedCounty],
    queryFn: async () => {
      const response = await api.get('/dashboard/registration-trend', {
        params: {
          days: 30,
          ...(selectedCounty ? { admin_unit_id: selectedCounty } : {}),
        },
      })
      return response.data?.data || []
    },
  })

  const { data: districtDataRaw, isLoading: districtLoading } = useQuery({
    queryKey: ['dashboard-districts', selectedCounty],
    queryFn: async () => {
      const response = await api.get('/dashboard/district-performance', {
        params: selectedCounty ? { admin_unit_id: selectedCounty } : {},
      })
      return response.data?.data || []
    },
  })

  if (kpisLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  const summaryTotal = datasetSummary?.total ?? 0
  const summaryRegistered = datasetSummary?.registered ?? 0
  const summaryProgress = datasetSummary?.progress_percent ?? 0
  const progressPercent = datasetSummaryLoading ? 0 : (datasetSummary ? summaryProgress : (kpis?.adult_population ? (kpis.registered_voters / kpis.adult_population) * 100 : 0))

  // Format trend data
  const trends = Array.isArray(trendsRaw) ? trendsRaw.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: d.count || 0,
    fullDate: d.date,
  })).sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()) : []

  // Format district data
  const districtData = Array.isArray(districtDataRaw) ? districtDataRaw.map((d: any) => ({
    districtName: d.district_name || d.districtName || 'Unknown',
    registeredCount: d.registered_count || d.registeredCount || 0,
    targetCount: d.target_count || d.targetCount || 0,
  })) : []

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Dashboard</Typography>
        <Button variant="contained" onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      {/* County Filter */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#FFFFFF' }}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>Select County</InputLabel>
          <Select
            value={selectedCounty}
            onChange={(e: any) => setSelectedCounty(e.target.value)}
            label="Select County"
          >
            <MenuItem value="">All Counties</MenuItem>
            {counties && counties.length > 0 ? (
              counties.map((county: any) => (
                <MenuItem key={county.id} value={county.id}>
                  {county.name}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                No counties available
              </MenuItem>
            )}
          </Select>
        </FormControl>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="Total Citizens" value={summaryTotal || kpis?.adult_population || 0} />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="Registered" value={summaryRegistered || kpis?.registered_voters || 0} />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="Today's Target" value={kpis?.todays_target || 0} />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard label="Progress" value={Math.round(progressPercent) || 0} suffix="%" />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Registration Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Registration Trend (Last 30 Days)
              </Typography>
              {trendsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '4px' }}
                      labelStyle={{ color: '#000' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#0056A6" 
                      strokeWidth={2} 
                      dot={{ fill: '#0056A6', r: 4 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, color: '#6B7280' }}>
                  No registration trend data available
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* District Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                District Performance
              </Typography>
              {districtLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : districtData && districtData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={districtData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="districtName" 
                      stroke="#6B7280" 
                      style={{ fontSize: '12px' }} 
                      angle={-45} 
                      textAnchor="end" 
                      height={80} 
                    />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '4px' }}
                      labelStyle={{ color: '#000' }}
                    />
                    <Bar dataKey="registeredCount" fill="#0056A6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, color: '#6B7280' }}>
                  No district performance data available
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overall Progress Circle + Citizens Table */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
                Overall Progress
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, position: 'relative', width: 120, height: 120, mx: 'auto' }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={120}
                  sx={{ color: '#E5E7EB' }}
                />
                <CircularProgress
                  variant="determinate"
                  value={Math.min(progressPercent, 100)}
                  size={120}
                  sx={{ color: progressPercent >= 80 ? '#10B981' : progressPercent >= 50 ? '#F59E0B' : '#DC2626', position: 'absolute' }}
                />
                <Typography
                  variant="h4"
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
              <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                {kpis?.registered_voters?.toLocaleString() || 0} of {kpis?.adult_population?.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Citizens</Typography>
            <ExportButton label="Export" variant="contained" size="small" />
          </Box>
          <CitizensTable countyId={selectedCounty} />
        </Grid>
      </Grid>
    </Box>
  )
}
