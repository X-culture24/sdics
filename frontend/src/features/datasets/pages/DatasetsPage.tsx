import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Chip,
  IconButton,
} from '@mui/material'
import {
  CloudUpload as CloudUploadIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Visibility as EyeIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetService, type DatasetUpload } from '@/services/api/datasetService.ts'
import DatasetGrid from '@/components/DatasetGrid'

export default function DatasetsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [county, setCounty] = useState('')
  const [selectedDataset, setSelectedDataset] = useState<DatasetUpload | null>(null)
  const [viewGridOpen, setViewGridOpen] = useState(false)
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)

  // Load datasets
  const { data, isLoading } = useQuery({
    queryKey: ['datasets', page, pageSize],
    queryFn: () => datasetService.listDatasets(page + 1, pageSize),
  })

  // Load validation errors
  const validationQuery = useQuery({
    queryKey: ['dataset_validation_errors', selectedDataset?.id],
    queryFn: () => (selectedDataset ? datasetService.getValidationErrors(selectedDataset.id, 1, 100) : null),
    enabled: !!selectedDataset,
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, county }: { file: File; county: string }) => datasetService.upload(file, county),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      setUploadDialogOpen(false)
      setSelectedFile(null)
      setCounty('')
    },
  })

  const handleUploadClick = () => {
    if (selectedFile && county) {
      uploadMutation.mutate({ file: selectedFile, county })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleViewDataset = (dataset: DatasetUpload) => {
    setSelectedDataset(dataset)
    setViewGridOpen(true)
  }

  const handleShowValidationErrors = (dataset: DatasetUpload) => {
    setSelectedDataset(dataset)
    setValidationDialogOpen(true)
  }

  const getStatusColor = (status: string): any => {
    switch (status) {
      case 'Completed':
        return 'success'
      case 'Processing':
        return 'info'
      case 'Failed':
        return 'error'
      case 'Pending':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Dataset Management
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              Upload, view, and manage Excel datasets
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Dataset
          </Button>
        </Box>

        {/* Dataset List */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
                <TableCell sx={{ fontWeight: 600 }}>County</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Filename</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Row Count
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Upload Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((dataset) => (
                  <TableRow key={dataset.id} hover>
                    <TableCell>{dataset.county}</TableCell>
                    <TableCell sx={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Tooltip title={dataset.filename}>
                        <span>{dataset.filename}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{dataset.row_count}</TableCell>
                    <TableCell>
                      <Chip
                        label={dataset.status}
                        color={getStatusColor(dataset.status)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{new Date(dataset.upload_date).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Records">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDataset(dataset)}
                        >
                          <EyeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {dataset.status === 'Completed' && (
                        <Tooltip title="View Validation Errors">
                          <IconButton
                            size="small"
                            onClick={() => handleShowValidationErrors(dataset)}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">No datasets uploaded yet</Typography>
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
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => setPageSize(parseInt(e.target.value, 10))}
        />
      </Stack>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Dataset</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="County Name"
              fullWidth
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="e.g., Nairobi, Mombasa"
            />
            <Box sx={{ border: '2px dashed #ccc', borderRadius: 1, p: 2, textAlign: 'center', cursor: 'pointer' }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
                <CloudUploadIcon sx={{ fontSize: 40, color: '#999', mb: 1 }} />
                <Typography variant="body2">
                  {selectedFile ? selectedFile.name : 'Click to select Excel file'}
                </Typography>
              </label>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUploadClick}
            variant="contained"
            disabled={uploadMutation.isPending || !selectedFile || !county}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dataset Grid Dialog */}
      <Dialog open={viewGridOpen} onClose={() => setViewGridOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          Dataset: {selectedDataset?.county} - {selectedDataset?.filename}
        </DialogTitle>
        <DialogContent sx={{ minHeight: '600px' }}>
          {selectedDataset && <DatasetGrid uploadId={selectedDataset.id} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewGridOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Validation Errors Dialog */}
      <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Validation Errors - {selectedDataset?.filename}</DialogTitle>
        <DialogContent sx={{ minHeight: '400px' }}>
          {validationQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (validationQuery.data?.data || []).length > 0 ? (
            <TableContainer sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Row</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationQuery.data?.data.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell>{error.row_number}</TableCell>
                      <TableCell>{error.field_name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={error.error_severity}
                          color={error.error_severity === 'ERROR' ? 'error' : 'warning'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{error.error_message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography sx={{ mt: 2 }} color="success.main">
              No validation errors found!
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
