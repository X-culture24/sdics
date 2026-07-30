import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  CircularProgress,
  Typography,
  Chip,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { citizenService } from '@/services/api/citizenService'
import { campaignService } from '@/services/api/campaignService'
import type { Citizen } from '@/types/api'
import { useWebSocket, type WebSocketMessage } from '@/hooks/useWebSocket'

interface CitizensTableProps {
  countyId?: string;
}

export default function CitizensTable({ countyId }: CitizensTableProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedCitizens, setSelectedCitizens] = useState<Set<string>>(new Set())
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({ campaignId: '' })

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'citizen_registered') {
        console.log('Citizen registered:', message.data.full_name)
        queryClient.invalidateQueries({ queryKey: ['citizens'] })
      }
    },
  })

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.list(),
  })

  // Load unregistered citizens only
  const { data, isLoading } = useQuery({
    queryKey: ['citizens', page, pageSize, countyId],
    queryFn: async () => {
      const response = await citizenService.list({
        page: page + 1,
        pageSize,
        ...(countyId && { districtId: countyId }),
      })
      // Filter for unregistered only
      return {
        ...response,
        data: response.data?.filter((c: Citizen) => c.registrationStatus !== 'Registered') || [],
      }
    },
  })

  const registerMutation = useMutation({
    mutationFn: (citizenId: string) =>
      citizenService.register(citizenId, formData.campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizens'] })
      setOpenDialog(false)
      setSelectedCitizen(null)
      setFormData({ campaignId: '' })
    },
  })

  const handleOpenDialog = (citizen: Citizen) => {
    setSelectedCitizen(citizen)
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedCitizen(null)
    setFormData({ campaignId: '' })
  }

  const handleRegister = () => {
    if (selectedCitizen && formData.campaignId) {
      registerMutation.mutate(selectedCitizen.id)
    }
  }

  const handleSelectCitizen = (citizenId: string) => {
    const newSelected = new Set(selectedCitizens)
    if (newSelected.has(citizenId)) {
      newSelected.delete(citizenId)
    } else {
      newSelected.add(citizenId)
    }
    setSelectedCitizens(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.data) {
      setSelectedCitizens(new Set(data.data.map((c: Citizen) => c.id)))
    } else {
      setSelectedCitizens(new Set())
    }
  }

  const handleBulkRegister = async () => {
    if (selectedCitizens.size === 0 || !formData.campaignId) return
    
    for (const citizenId of Array.from(selectedCitizens)) {
      await citizenService.register(citizenId, formData.campaignId).catch(console.error)
    }
    
    setSelectedCitizens(new Set())
    queryClient.invalidateQueries({ queryKey: ['citizens'] })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Registered':
        return 'success'
      case 'Rejected':
        return 'error'
      default:
        return 'warning'
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  const unregisteredCount = data?.data?.length || 0

  return (
    <>
      {/* Bulk Actions */}
      {selectedCitizens.size > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#F0F9FF', borderLeft: '4px solid #0056A6' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedCitizens.size} citizen{selectedCitizens.size !== 1 ? 's' : ''} selected
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Campaign</InputLabel>
                <Select
                  value={formData.campaignId}
                  label="Campaign"
                  onChange={(e: React.ChangeEvent<any>) => setFormData({ ...formData, campaignId: e.target.value })}
                >
                  <MenuItem value="">-- Select Campaign --</MenuItem>
                  {campaigns?.data?.map((campaign: any) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleBulkRegister}
                disabled={!formData.campaignId || registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Registering...' : 'Register Selected'}
              </Button>
              <Button variant="outlined" onClick={() => setSelectedCitizens(new Set())}>
                Clear
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
              <TableCell sx={{ fontWeight: 600, width: '50px' }}>
                <Checkbox
                  checked={unregisteredCount > 0 && selectedCitizens.size === unregisteredCount}
                  indeterminate={selectedCitizens.size > 0 && selectedCitizens.size < unregisteredCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: '20%' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '15%' }}>National ID</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '10%' }}>Gender</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '15%' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '12%' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: '15%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data && data.data.length > 0 ? (
              data.data.map((citizen: Citizen) => (
                <TableRow 
                  key={citizen.id} 
                  hover 
                  sx={{ 
                    backgroundColor: selectedCitizens.has(citizen.id) ? '#F0F9FF' : 'inherit',
                    '&:hover': { backgroundColor: '#FAFAFA' } 
                  }}
                >
                  <TableCell sx={{ py: 2 }}>
                    <Checkbox
                      checked={selectedCitizens.has(citizen.id)}
                      onChange={() => handleSelectCitizen(citizen.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>{citizen.fullName || '-'}</TableCell>
                  <TableCell sx={{ py: 2, fontFamily: 'monospace' }}>{citizen.nationalId || '-'}</TableCell>
                  <TableCell sx={{ py: 2 }}>{citizen.gender || '-'}</TableCell>
                  <TableCell sx={{ py: 2 }}>{citizen.phoneNumber || '-'}</TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      label={citizen.registrationStatus}
                      color={getStatusColor(citizen.registrationStatus)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenDialog(citizen)}
                      sx={{ textTransform: 'none' }}
                    >
                      Register
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">All citizens registered</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data?.total || 0}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={(_: any, newPage: number) => setPage(newPage)}
        onRowsPerPageChange={(e: any) => setPageSize(parseInt(e.target.value, 10))}
      />

      {selectedCitizen && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Register Citizen as Voter</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Name
              </Typography>
              <Typography>{selectedCitizen.fullName}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                National ID
              </Typography>
              <Typography>{selectedCitizen.nationalId}</Typography>
            </Box>
            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel>Campaign</InputLabel>
              <Select
                value={formData.campaignId}
                label="Campaign"
                onChange={(e: React.ChangeEvent<any>) => setFormData({ ...formData, campaignId: e.target.value })}
              >
                <MenuItem value="">-- Select Campaign --</MenuItem>
                {campaigns?.data?.map((campaign: any) => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleRegister}
              variant="contained"
              disabled={registerMutation.isPending || !formData.campaignId}
            >
              {registerMutation.isPending ? 'Registering...' : 'Register'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
