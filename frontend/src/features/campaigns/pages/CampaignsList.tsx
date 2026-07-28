import { Box, Typography, Alert } from '@mui/material'

export default function CampaignsList() {
  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3, fontWeight: 700 }}>
        Campaigns
      </Typography>
      <Alert severity="info">
        Campaigns management interface coming soon...
      </Alert>
    </Box>
  )
}
