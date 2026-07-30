import { useState } from 'react';
import { Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '@/services/api/campaignService';

export default function CampaignsPage() {
  const [page] = useState(1);
  const pageSize = 20;
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', targetNids: '' });
  const queryClient = useQueryClient();

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns', page, pageSize],
    queryFn: () => campaignService.list(page, pageSize),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      campaignService.create({
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        initial_nid_count: parseInt(formData.targetNids) || 0,
        status: 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setOpenDialog(false);
      setFormData({ name: '', startDate: '', endDate: '', targetNids: '' });
    },
  });

  const campaigns = campaignsData?.data || [];

  const getStatusColor = (status: string): any => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'ongoing':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  const getNidCount = (campaign: any): number => {
    // Handle both camelCase and snake_case field names
    return campaign?.initialNidCount || campaign?.initial_nid_count || 0;
  };

  const handleCreateClick = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ name: '', startDate: '', endDate: '', targetNids: '' });
  };

  const handleSubmit = () => {
    if (formData.name && formData.startDate && formData.endDate) {
      createMutation.mutate();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Campaigns</Typography>
        <Button variant="contained" onClick={handleCreateClick}>
          New Campaign
        </Button>
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
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Target NIDs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#6B7280' }}>
                    No campaigns available
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign: any) => (
                  <TableRow key={campaign.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{campaign.name}</TableCell>
                    <TableCell>{formatDate(campaign.startDate || campaign.start_date)}</TableCell>
                    <TableCell>{formatDate(campaign.endDate || campaign.end_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={campaign.status}
                        size="small"
                        color={getStatusColor(campaign.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {getNidCount(campaign).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Campaign Modal */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Campaign</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Campaign Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Voter Registration Q1 2024"
            />
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="number"
              label="Target NIDs"
              value={formData.targetNids}
              onChange={(e) => setFormData({ ...formData, targetNids: e.target.value })}
              placeholder="e.g., 10000"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.startDate || !formData.endDate || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
