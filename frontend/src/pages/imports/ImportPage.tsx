import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  UploadFile as UploadIcon,
  CloudUpload as CloudUploadIcon,
  FolderSpecial as FolderIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Pause as PauseIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '@/services/api/imports';
import { formatDate, formatNumber } from '@/utils/format';
import { DataTable, ColDef } from '@/components/DataTable';
import type { ImportJob } from '@/types/dto';

const STATUS_CHIP: Record<ImportJob['status'], any> = {
  Pending: { color: 'default', label: 'Pending', icon: PauseIcon },
  Running: { color: 'info', label: 'In Progress', icon: RunIcon },
  Completed: { color: 'success', label: 'Completed', icon: CheckIcon },
  Failed: { color: 'error', label: 'Failed', icon: ErrorIcon },
};

const ImportPage: React.FC = () => {
  const qc = useQueryClient();
  const [pct, setPct] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const list = useQuery({
    queryKey: ['import-jobs'],
    queryFn: () => importsApi.list({ pageSize: 100 }),
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      const anyRunning = data?.some((j) => j.status === 'Running' || j.status === 'Pending');
      return anyRunning ? 3_000 : false;
    },
  });

  const datasetsImport = useMutation({
    mutationFn: () => importsApi.startFromDatasets(true),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
      setFeedback({ type: 'success', msg: `Import started — Job ${job.id.slice(0, 8)}` });
    },
    onError: (err: any) => setFeedback({ type: 'error', msg: err?.message ?? 'Import start failed' }),
  });

  const upload = useMutation({
    mutationFn: (f: File) =>
      importsApi.uploadFile(f, {
        onProgress: (p) => setPct(p),
      }),
    onMutate: () => setPct(0),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
      setFeedback({ type: 'success', msg: 'File uploaded successfully — import is running.' });
    },
    onError: (err: any) => setFeedback({ type: 'error', msg: err?.message ?? 'Upload failed' }),
    onSettled: () => setTimeout(() => setPct(0), 500),
  });

  const onDrop = useCallback(
    (files: File[]) => {
      const f = files[0];
      if (!f) return;
      if (!/\.(xlsx|xls)$/i.test(f.name)) {
        setFeedback({ type: 'error', msg: 'Only .xlsx or .xls files accepted.' });
        return;
      }
      upload.mutate(f);
    },
    [upload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  const cols: ColDef<ImportJob>[] = [
    {
      field: 'filename',
      header: 'File / Source',
      minWidth: 260,
      render: (j) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => `${t.palette.primary.main}15`,
              color: 'primary.main',
            }}
          >
            <UploadIcon sx={{ fontSize: 16 }} />
          </Box>
          <Box minWidth={0}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {j.filename}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Job ID · {j.id.slice(0, 10)}…
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      minWidth: 150,
      align: 'center',
      render: (j) => {
        const s = STATUS_CHIP[j.status] ?? STATUS_CHIP.Pending;
        const Icon = s.icon;
        return (
          <Chip
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Icon sx={{ fontSize: 14 }} />
                <span>{s.label}</span>
              </Stack>
            }
            size="small"
            color={s.color as any}
            variant={s.color === 'default' ? 'outlined' : 'filled'}
          />
        );
      },
    },
    {
      field: 'totalRows',
      header: 'Rows Total',
      align: 'right',
      render: (j) => <Typography variant="body2">{formatNumber(j.totalRows ?? 0)}</Typography>,
    },
    {
      field: 'insertedRows',
      header: 'Inserted',
      align: 'right',
      render: (j) => (
        <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>
          {formatNumber(j.insertedRows ?? 0)}
        </Typography>
      ),
    },
    {
      field: 'rejectedRows',
      header: 'Rejected',
      align: 'right',
      render: (j) => (
        <Typography variant="body2" color={(j.rejectedRows ?? 0) > 0 ? 'error' : 'text.primary'}>
          {formatNumber(j.rejectedRows ?? 0)}
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      header: 'Submitted',
      minWidth: 180,
      render: (j) => <Typography variant="body2">{formatDate(j.createdAt, true)}</Typography>,
    },
    {
      field: '_actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (j) => (
        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
          {j.status === 'Completed' || j.status === 'Failed' ? (
            <Tooltip title={j.status === 'Failed' ? 'Error report' : 'Download sample'}>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => importsApi.downloadError(j.filename)}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            Data Import
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload citizen datasets (Excel) or bulk-import the datasets directory.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => list.refetch()}
            disabled={list.isFetching}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<FolderIcon />}
            onClick={() => datasetsImport.mutate()}
            disabled={datasetsImport.isPending}
          >
            Import from datasets/ folder
          </Button>
        </Stack>
      </Stack>

      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.msg}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid xs={12} lg={5}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: { xs: 280, sm: 380 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Upload Dataset
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                Drag and drop a .xlsx file or click to browse. (National IDs, names, counties, districts required.)
              </Typography>

              <Box
                {...getRootProps()}
                sx={{
                  flex: 1,
                  border: (t) =>
                    `2px dashed ${isDragActive ? t.palette.primary.main : t.palette.divider}`,
                  borderRadius: 3,
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? (t) => `${t.palette.primary.main}0a` : 'transparent',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: (t) => `${t.palette.primary.main}08`,
                    borderColor: (t) => t.palette.primary.light,
                  },
                }}
              >
                <input {...getInputProps()} />
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '50%',
                    bgcolor: (t) => `${t.palette.primary.main}12`,
                    color: 'primary.main',
                    mb: 1.5,
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 36 }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {isDragActive ? 'Drop the file here' : 'Drop your Excel file here'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360 }}>
                  Accepts .xlsx spreadsheets (preferred) or legacy .xls. Column headers are auto-detected.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
                  }}
                >
                  Browse Files
                </Button>
              </Box>

              {upload.isPending && (
                <Box sx={{ mt: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      UPLOADING · {Math.round(pct)}%
                    </Typography>
                    <CircularProgress size={16} thickness={5} />
                  </Stack>
                  <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, pct))} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} lg={7}>
          <Card
            sx={{
              minHeight: { xs: 280, sm: 380 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CardContent sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Import History
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Running jobs refresh automatically every 3 seconds.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75}>
                  <Chip
                    size="small"
                    label={`${list.data?.total ?? 0} total`}
                    color="primary"
                    variant="outlined"
                  />
                </Stack>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ flex: 1, minHeight: 200 }}>
                <DataTable
                  rows={list.data?.data ?? []}
                  columns={cols}
                  getRowId={(r) => r.id}
                  loading={list.isLoading || list.isFetching}
                  pageSize={8}
                  searchFields={['filename']}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default ImportPage;
