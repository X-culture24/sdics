import { Box, Card, Typography, Button, Grid } from '@mui/material';

export default function ReportsPage() {
  const reports = [
    { title: 'District Performance', description: 'Registration stats by district' },
    { title: 'Daily Summary', description: 'Daily registration trends' },
    { title: 'Status Report', description: 'Registered vs pending vs rejected' },
  ];

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Reports
      </Typography>
      <Grid container spacing={2}>
        {reports.map((report, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card sx={{ p: 3, cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
              <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                {report.title}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
                {report.description}
              </Typography>
              <Button variant="outlined" size="small">
                View Report
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
