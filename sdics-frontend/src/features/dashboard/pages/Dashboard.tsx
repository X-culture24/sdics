import { Box, Grid, Card, CardContent, Typography, CircularProgress } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/v1/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    },
  })

  if (isLoading) return <CircularProgress />

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>
      <Grid container spacing={3}>
        {[
          { label: 'Total Citizens', value: data?.total_citizens || 0 },
          { label: 'Registered', value: data?.registered || 0, color: 'success' },
          { label: 'Unregistered', value: data?.unregistered || 0, color: 'warning' },
          { label: 'Registration %', value: `${data?.registration_percentage || 0}%`, color: 'primary' },
        ].map((item, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>{item.label}</Typography>
                <Typography variant="h5" sx={{ color: item.color ? `${item.color}.main` : 'inherit' }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
