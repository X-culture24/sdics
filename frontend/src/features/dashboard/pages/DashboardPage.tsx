import { Box, Grid, Card, CardContent, Typography, CircularProgress } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import api from '../../../api/axios'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Dashboard</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Citizens
              </Typography>
              <Typography variant="h4">
                {data?.total_citizens || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Registered
              </Typography>
              <Typography variant="h4" sx={{ color: 'success.main' }}>
                {data?.registered || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Unregistered
              </Typography>
              <Typography variant="h4" sx={{ color: 'warning.main' }}>
                {data?.unregistered || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Registration %
              </Typography>
              <Typography variant="h4" sx={{ color: 'primary.main' }}>
                {data?.registration_percentage || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
