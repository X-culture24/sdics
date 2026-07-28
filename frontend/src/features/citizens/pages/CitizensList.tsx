import { Box, Typography, Alert } from '@mui/material'

export default function CitizensList() {
  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3, fontWeight: 700 }}>
        Citizens Management
      </Typography>
      <Alert severity="info">
        Citizens management interface coming soon...
      </Alert>
    </Box>
  )
}
