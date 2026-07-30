import { useState, useRef } from 'react';
import { Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { CloudUpload as UploadIcon, Download as DownloadIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import type { ImportJob } from '@/types/api';

export default function ImportsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  // Fetch import jobs list
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['import-jobs'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/imports');
      const jobList = data?.data || data || [];
      if (!Array.isArray(jobList)) return [];
      
      // Convert snake_case to camelCase
      return jobList.map((job: any) => ({
        id: job.id,
        filename: job.filename,
        uploaderId: job.uploader_id ?? job.uploaderId,
        campaignId: job.campaign_id ?? job.campaignId,
        status: job.status,
        totalRows: job.total_rows ?? job.totalRows ?? 0,
        insertedRows: job.inserted_rows ?? job.insertedRows ?? 0,
        rejectedRows: job.rejected_rows ?? job.rejectedRows ?? 0,
        errorReportUrl: job.error_report_url ?? job.errorReportUrl,
        startedAt: job.started_at ?? job.startedAt,
        completedAt: job.completed_at ?? job.completedAt,
        createdAt: job.created_at ?? job.createdAt,
      }));
    },
    refetchInterval: 5000, // Refresh every 5 seconds to show progress
  });

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (max 55MB as per nginx config)
    if (file.size > 55 * 1024 * 1024) {
      toast.error('File size exceeds 55MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await apiClient.post('/imports/upload', formData);

      toast.success('File uploaded successfully!');
      // Refresh the jobs list
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error.response?.data?.error?.message || error.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
      case 'pending':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressValue = (job: ImportJob): number => {
    if (job.totalRows === 0) return 0;
    return ((job.insertedRows + job.rejectedRows) / job.totalRows) * 100;
  };

  const downloadErrorReport = (job: ImportJob) => {
    if (job.errorReportUrl) {
      window.open(job.errorReportUrl, '_blank');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Data Imports</Typography>
        <Button 
          variant="contained" 
          startIcon={<UploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </Box>

      {/* Upload Drop Zone */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          p: 3,
          mb: 3,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: dragOver ? '#0056A6' : '#E5E7EB',
          backgroundColor: dragOver ? '#F0F7FF' : 'transparent',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: uploading ? 0.6 : 1,
          pointerEvents: uploading ? 'none' : 'auto',
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#6B7280' }}>
              Uploading file...
            </Typography>
          </>
        ) : (
          <>
            <UploadIcon sx={{ fontSize: 48, color: '#0056A6', mb: 1 }} />
            <Typography variant="h4" sx={{ mb: 1 }}>
              Drag and drop Excel file here
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              or click to select file (.xlsx, .xls - Max 55MB)
            </Typography>
          </>
        )}
      </Card>

      {/* Import Jobs List */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
                <TableCell sx={{ fontWeight: 700 }}>Filename</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Progress</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Total Rows</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Inserted</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Rejected</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#6B7280' }}>
                    No imports yet
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job: ImportJob) => (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {job.filename}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        color={getStatusColor(job.status) as any}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={getProgressValue(job)}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ minWidth: 35 }}>
                          {Math.round(getProgressValue(job))}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {(job?.totalRows ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#16A34A', fontWeight: 600 }}>
                      {(job?.insertedRows ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: '#DC2626', fontWeight: 600 }}>
                      {(job?.rejectedRows ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        {job.errorReportUrl && (
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => downloadErrorReport(job)}
                          >
                            Errors
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedJob(job);
                            setShowDetails(true);
                          }}
                        >
                          Details
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Job Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Job Details</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedJob && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  Filename
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedJob.filename}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  Status
                </Typography>
                <Chip
                  label={selectedJob.status}
                  size="small"
                  color={getStatusColor(selectedJob.status) as any}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  Progress
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressValue(selectedJob)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    {Math.round(getProgressValue(selectedJob))}% ({selectedJob.insertedRows + selectedJob.rejectedRows} of {selectedJob.totalRows})
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Total Rows
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#0056A6', fontWeight: 700 }}>
                    {selectedJob.totalRows.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Inserted
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#16A34A', fontWeight: 700 }}>
                    {selectedJob.insertedRows.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Rejected
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#DC2626', fontWeight: 700 }}>
                    {selectedJob.rejectedRows.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Success Rate
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#0056A6', fontWeight: 700 }}>
                    {selectedJob.totalRows > 0
                      ? Math.round((selectedJob.insertedRows / selectedJob.totalRows) * 100)
                      : 0}
                    %
                  </Typography>
                </Box>
              </Box>
              {selectedJob.startedAt && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Started
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedJob.startedAt).toLocaleString()}
                  </Typography>
                </Box>
              )}
              {selectedJob.completedAt && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    Completed
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedJob.completedAt).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedJob?.errorReportUrl && (
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => selectedJob && downloadErrorReport(selectedJob)}
            >
              Download Errors
            </Button>
          )}
          <Button onClick={() => setShowDetails(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
