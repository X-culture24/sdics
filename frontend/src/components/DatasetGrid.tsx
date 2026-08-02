import { useState, useMemo } from 'react'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material'
import { Download as DownloadIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetService, type DatasetRecord, type DatasetListParams } from '@/services/api/datasetService'

interface DatasetGridProps {
  uploadId: string
}

interface EditingCell {
  recordId: string
  field: string
}

export default function DatasetGrid({ uploadId }: DatasetGridProps) {
  console.log('DatasetGrid mounted with uploadId:', uploadId)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [filters, setFilters] = useState<DatasetListParams>({
    county: '',
    district: '',
    gender: '',
    registration_status: '',
    national_id: '',
    name: '',
  })
  const [sortBy, setSortBy] = useState('row_number')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')

  // Load dataset records
  const { data, isLoading, error } = useQuery({
    queryKey: ['dataset_records', uploadId, page, pageSize, filters, sortBy, sortOrder],
    queryFn: () =>
      datasetService.listRecords(uploadId, {
        ...filters,
        page: page + 1,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  })

  // Update record mutation
  const updateMutation = useMutation({
    mutationFn: ({ recordId, updates }: { recordId: string; updates: Partial<DatasetRecord> }) =>
      datasetService.updateRecord(uploadId, recordId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataset_records'] })
      setEditingCell(null)
    },
  })

  // Delete record mutation
  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => datasetService.deleteRecord(uploadId, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataset_records'] })
    },
  })

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => datasetService.exportToExcel(uploadId, filters),
    onSuccess: (blob) => {
      const timestamp = new Date().toISOString().split('T')[0]
      datasetService.downloadExcel(blob, `dataset_${timestamp}.xlsx`)
    },
  })

  // Get all available fields from records
  const allFields = useMemo(() => {
    const fields = new Set<string>([
      'row_number',
      'national_id',
      'full_name',
      'gender',
      'phone_number',
      'county',
      'district',
      'division',
      'location',
      'sub_location',
      'village',
      'polling_station',
      'registration_status',
      'registration_date',
    ])

    if (data?.records) {
      data.records.forEach((record) => {
        if (record.extra_data) {
          Object.keys(record.extra_data).forEach((key) => fields.add(key))
        }
      })
    }

    return Array.from(fields).sort()
  }, [data])

  // Get value for a record field
  const getFieldValue = (record: DatasetRecord, field: string): string => {
    if (field === 'row_number') return record.row_number.toString()
    if (field in record) return String((record as any)[field] || '')
    if (record.extra_data && field in record.extra_data) return String(record.extra_data[field] || '')
    return ''
  }

  // Handle cell edit start
  const handleEditStart = (recordId: string, field: string, currentValue: string) => {
    setEditingCell({ recordId, field })
    setEditValue(currentValue)
  }

  // Handle cell edit save
  const handleEditSave = async () => {
    if (!editingCell) return

    const updates: Partial<DatasetRecord> = {
      [editingCell.field]: editValue,
    }

    updateMutation.mutate({ recordId: editingCell.recordId, updates })
  }

  // Handle cell edit cancel
  const handleEditCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // Handle select
  const handleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedRecords(newSelected)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.records) {
      setSelectedRecords(new Set(data.records.map((r) => r.id)))
    } else {
      setSelectedRecords(new Set())
    }
  }

  // Handle delete
  const handleDelete = (recordId: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(recordId)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6" sx={{ mb: 1 }}>
          Error Loading Records
        </Typography>
        <Typography color="error" variant="body2">
          {(error as any)?.message || 'Failed to load dataset records. Please check your filters and try again.'}
        </Typography>
      </Box>
    )
  }

  const recordCount = data?.records?.length || 0
  const isEditing = editingCell !== null

  return (
    <>
      {/* Filters & Actions */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Filters & Actions
        </Typography>
        <Stack spacing={2}>
          {/* Filters Row 1 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            <TextField
              label="National ID"
              size="small"
              value={filters.national_id || ''}
              onChange={(e) => setFilters({ ...filters, national_id: e.target.value })}
            />
            <TextField
              label="Name"
              size="small"
              value={filters.name || ''}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
            <TextField
              label="County"
              size="small"
              value={filters.county || ''}
              onChange={(e) => setFilters({ ...filters, county: e.target.value })}
            />
            <TextField
              label="District"
              size="small"
              value={filters.district || ''}
              onChange={(e) => setFilters({ ...filters, district: e.target.value })}
            />
          </Box>

          {/* Filters Row 2 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            <TextField
              label="Gender"
              size="small"
              value={filters.gender || ''}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
            />
            <TextField
              label="Registration Status"
              size="small"
              value={filters.registration_status || ''}
              onChange={(e) => setFilters({ ...filters, registration_status: e.target.value })}
            />
            <Button
              variant="outlined"
              onClick={() => setFilters({ county: '', district: '', gender: '', registration_status: '', national_id: '', name: '' })}
              size="small"
            >
              Clear Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              size="small"
            >
              {exportMutation.isPending ? 'Exporting...' : 'Export to Excel'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Sorting Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Sort By</InputLabel>
          <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
            {allFields.map((field) => (
              <MenuItem key={field} value={field}>
                {field.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Order</InputLabel>
          <Select value={sortOrder} label="Order" onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}>
            <MenuItem value="ASC">Ascending</MenuItem>
            <MenuItem value="DESC">Descending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
              <TableCell sx={{ fontWeight: 600, width: '50px' }}>
                <Checkbox
                  checked={recordCount > 0 && selectedRecords.size === recordCount}
                  indeterminate={selectedRecords.size > 0 && selectedRecords.size < recordCount}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: '50px' }}>Actions</TableCell>
              {allFields.map((field) => (
                <TableCell key={field} sx={{ fontWeight: 600, minWidth: '120px' }}>
                  {field.replace(/_/g, ' ')}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.records && data.records.length > 0 ? (
              data.records.map((record) => (
                <TableRow
                  key={record.id}
                  hover
                  sx={{
                    backgroundColor: selectedRecords.has(record.id) ? '#F0F9FF' : 'inherit',
                    '&:hover': { backgroundColor: '#FAFAFA' },
                  }}
                >
                  <TableCell sx={{ py: 1 }}>
                    <Checkbox checked={selectedRecords.has(record.id)} onChange={() => handleSelectRecord(record.id)} />
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(record.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  {allFields.map((field) => {
                    const isEditing = editingCell?.recordId === record.id && editingCell?.field === field
                    const value = getFieldValue(record, field)

                    return (
                      <TableCell
                        key={`${record.id}-${field}`}
                        sx={{ py: 1, cursor: 'pointer', fontSize: '0.875rem' }}
                        onClick={() => field !== 'row_number' && handleEditStart(record.id, field, value)}
                      >
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave()
                              if (e.key === 'Escape') handleEditCancel()
                            }}
                            autoFocus
                            sx={{ width: '100%' }}
                          />
                        ) : (
                          <Tooltip title={value}>
                            <span>{value || '-'}</span>
                          </Tooltip>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allFields.length + 2} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No records found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={data?.total || 0}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => setPageSize(parseInt(e.target.value, 10))}
      />
    </>
  )
}
