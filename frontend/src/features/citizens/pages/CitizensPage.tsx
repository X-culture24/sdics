import { useState } from 'react';
import {
  Box,
  Card,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  IconButton,
  Checkbox,
  Alert,
} from '@mui/material';
import { Visibility as ViewIcon, CheckCircle as RegisterIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { citizenService } from '@/services/api/citizenService';
import { queryClient } from '@/lib/queryClient';
import type { Citizen } from '@/types/api';

export default function CitizensPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [selectedCitizens, setSelectedCitizens] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['citizens', { page, pageSize, search }],
    queryFn: () => citizenService.list({ page: page + 1, pageSize, search }),
  });

  const registerMutation = useMutation({
    mutationFn: (citizenId: string) => citizenService.register(citizenId),
    onSuccess: () => {
      toast.success('Citizen registered successfully');
      queryClient.invalidateQueries({ queryKey: ['citizens'] });
      setDetailOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Registration failed');
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'Registered':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const toggleSelect = (citizenId: string) => {
    const newSelected = new Set(selectedCitizens);
    if (newSelected.has(citizenId)) {
      newSelected.delete(citizenId);
    } else {
      newSelected.add(citizenId);
    }
    setSelectedCitizens(newSelected);
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Citizens Search & Registration
      </Typography>

      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Search by National ID or Name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ flexGrow: 1 }}
            variant="outlined"
            placeholder="e.g., 12345678 or John Doe"
          />
          <Button variant="contained">
            Search
          </Button>
        </Box>
        <Typography variant="caption" sx={{ color: '#6B7280' }}>
          Select citizens from the table below, then use the registration form to mark them as voters
        </Typography>
      </Card>

      {/* Citizens Table */}
      <Card sx={{ mb: 4 }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
                <TableCell sx={{ fontWeight: 700, width: 50 }}>
                  <Checkbox
                    checked={selectedCitizens.size === data?.data.length && data?.data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCitizens(new Set(data?.data.map(c => c.id) || []));
                      } else {
                        setSelectedCitizens(new Set());
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>National ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>District</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#6B7280' }}>
                    No citizens found
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((citizen) => (
                  <TableRow
                    key={citizen.id}
                    sx={{
                      backgroundColor: selectedCitizens.has(citizen.id) ? '#EAF4FF' : 'transparent',
                      '&:hover': { backgroundColor: '#F9FAFB' },
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedCitizens.has(citizen.id)}
                        onChange={() => toggleSelect(citizen.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{citizen.nationalId}</TableCell>
                    <TableCell>{citizen.fullName}</TableCell>
                    <TableCell>{citizen.phoneNumber || '-'}</TableCell>
                    <TableCell>{citizen.district?.name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={citizen.registrationStatus}
                        color={statusColor(citizen.registrationStatus)}
                        size="small"
                        variant={citizen.registrationStatus === 'Unregistered' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedCitizen(citizen);
                          setDetailOpen(true);
                        }}
                        title="View details"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 15, 25, 50]}
          component="div"
          count={data?.total || 0}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      {/* Registration Form */}
      {selectedCitizens.size > 0 && (
        <Card sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #EAF4FF 0%, #F6F8FB 100%)', border: '2px solid #0056A6' }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: '#0056A6' }}>
            Bulk Registration Form
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            {selectedCitizens.size} citizen{selectedCitizens.size !== 1 ? 's' : ''} selected for registration
          </Alert>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<RegisterIcon />}
              onClick={() => setRegistrationModalOpen(true)}
            >
              Mark All as Registered
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedCitizens(new Set())}
            >
              Clear Selection
            </Button>
          </Box>
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Citizen Details</DialogTitle>
        <DialogContent>
          {selectedCitizen && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  National ID
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedCitizen.nationalId}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  Full Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedCitizen.fullName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  Gender
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedCitizen.gender}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  Phone
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedCitizen.phoneNumber || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  District
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedCitizen.district?.name || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  Registration Status
                </Typography>
                <Chip
                  label={selectedCitizen.registrationStatus}
                  color={statusColor(selectedCitizen.registrationStatus)}
                  sx={{ mt: 0.5 }}
                  variant={selectedCitizen.registrationStatus === 'Unregistered' ? 'outlined' : 'filled'}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          {selectedCitizen?.registrationStatus === 'Unregistered' && (
            <Button
              variant="contained"
              startIcon={<RegisterIcon />}
              onClick={() => selectedCitizen && registerMutation.mutate(selectedCitizen.id)}
              disabled={registerMutation.isPending}
            >
              Register
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk Registration Confirmation */}
      <Dialog open={registrationModalOpen} onClose={() => setRegistrationModalOpen(false)}>
        <DialogTitle>Confirm Bulk Registration</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You are about to mark {selectedCitizens.size} citizen{selectedCitizens.size !== 1 ? 's' : ''} as registered voters.
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.875rem' }}>
            This action will update their registration status and record the timestamp.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegistrationModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              selectedCitizens.forEach(citizenId => registerMutation.mutate(citizenId));
              setRegistrationModalOpen(false);
              setSelectedCitizens(new Set());
            }}
          >
            Confirm Registration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
