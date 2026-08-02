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
import { campaignService } from '@/services/api/campaignService.ts'
import { datasetService } from '@/services/api/datasetService.ts'
import type { DatasetRecord } from '@/services/api/datasetService.ts'
import { useWebSocket, type WebSocketMessage } from '@/hooks/useWebSocket'
import api from '@/services/api/client'

interface CitizensTableProps {
  countyId?: string;
}

export default function CitizensTable({ countyId }: CitizensTableProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedCitizens, setSelectedCitizens] = useState<Set<string>>(new Set())
  const [selectedRecord, setSelectedRecord] = useState<DatasetRecord | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({ campaignId: '' })

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'citizen_registered') {
        console.log('Citizen registered:', message.data.full_name)
        queryClient.invalidateQueries({ queryKey: ['dataset-records'] })
      }
    },
  })

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.list(),
  })

  // Fetch dataset records by county using the datasetService
  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['dataset-records', page, pageSize, countyId],
    queryFn: async () => {
      if (!countyId) {
        return { records: [], total: 0, page: 1, page_size: pageSize, total_page: 0 }
      }
      
      try {
        // Call the dataset records endpoint by county_id using the service
        console.log('CitizensTable: Fetching records for countyId:', countyId)
        const data = await datasetService.listRecordsByCountyId(countyId, {
          page: page + 1,
          page_size: pageSize,
        })
        console.log('CitizensTable: Records response:', data)
        
        return data || { records: [], total: 0, page: 1, page_size: pageSize, total_page: 0 }
      } catch (err) {
        console.error('Error loading dataset records:', err)
        return { records: [], total: 0, page: 1, page_size: pageSize, total_page: 0 }
      }
    },
  })

  const registerMutation = useMutation({
    mutationFn: (recordId: string) =>
      api.post('/dataset-records/register', {
        record_id: recordId,
        campaign_id: formData.campaignId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataset-records'] })
      setOpenDialog(false)
      setSelectedRecord(null)
      setFormData({ campaignId: '' })
    },
  })

  const handleOpenDialog = (record: DatasetRecord) => {
    setSelectedRecord(record)
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedRecord(null)
    setFormData({ campaignId: '' })
  }

  const handleRegister = () => {
    if (selectedRecord && formData.campaignId) {
      registerMutation.mutate(selectedRecord.id)
    }
  }

  const handleSelectCitizen = (recordId: string) => {
    const newSelected = new Set(selectedCitizens)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedCitizens(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && recordsData?.records) {
      setSelectedCitizens(new Set(recordsData.records.map((r: DatasetRecord) => r.id)))
    } else {
      setSelectedCitizens(new Set())
    }
  }

  const handleBulkRegister = async () => {
    if (selectedCitizens.size === 0 || !formData.campaignId) return
    
    for (const recordId of Array.from(selectedCitizens)) {
      await api.post('/dataset-records/register', {
        record_id: recordId,
        campaign_id: formData.campaignId,
      }).catch(console.error)
    }
    
    setSelectedCitizens(new Set())
    queryClient.invalidateQueries({ queryKey: ['dataset-records'] })
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!countyId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography color="textSecondary">Select a county to view dataset records</Typography>
      </Box>
    )
  }

  const recordCount = recordsData?.records?.length || 0

  return (
    <>
      {/* Bulk Actions */}
      {selectedCitizens.size > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#F0F9FF', borderLeft: '4px solid #0056A6' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedCitizens.size} record{selectedCitizens.size !== 1 ? 's' : ''} selected
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
                  checked={recordCount > 0 && selectedCitizens.size === recordCount}
                  indeterminate={selectedCitizens.size > 0 && selectedCitizens.size < recordCount}
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
            {recordsData?.records && recordsData.records.length > 0 ? (
              recordsData.records.map((record: DatasetRecord) => (
                <TableRow 
                  key={record.id} 
                  hover 
                  sx={{ 
                    backgroundColor: selectedCitizens.has(record.id) ? '#F0F9FF' : 'inherit',
                    '&:hover': { backgroundColor: '#FAFAFA' } 
                  }}
                >
                  <TableCell sx={{ py: 2 }}>
                    <Checkbox
                      checked={selectedCitizens.has(record.id)}
                      onChange={() => handleSelectCitizen(record.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>{record.full_name || '-'}</TableCell>
                  <TableCell sx={{ py: 2, fontFamily: 'monospace' }}>{record.national_id || '-'}</TableCell>
                  <TableCell sx={{ py: 2 }}>{record.gender || '-'}</TableCell>
                  <TableCell sx={{ py: 2 }}>{record.phone_number || '-'}</TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      label={record.registration_status || 'Unregistered'}
                      color={record.registration_status === 'Registered' ? 'success' : 'warning'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleOpenDialog(record)}
                      sx={{ textTransform: 'none' }}
                      disabled={record.registration_status === 'Registered'}
                    >
                      Register
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No dataset records found for this county</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={recordsData?.total || 0}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={(_: any, newPage: number) => setPage(newPage)}
        onRowsPerPageChange={(e: any) => setPageSize(parseInt(e.target.value, 10))}
      />

      {selectedRecord && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Register Person as Voter</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Name
              </Typography>
              <Typography>{selectedRecord.full_name}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                National ID
              </Typography>
              <Typography>{selectedRecord.national_id}</Typography>
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
