import { Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export default function CampaignsPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Campaigns</Typography>
        <Button variant="contained">New Campaign</Button>
      </Box>
      <Card sx={{ p: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
                <TableCell sx={{ fontWeight: 700 }}>Campaign Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#6B7280' }}>
                  No campaigns available
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
