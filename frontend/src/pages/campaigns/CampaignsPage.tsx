import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Check as CheckIcon,
  Archive as ArchiveIcon,
  MoreVert as DotsIcon,
  BarChart as ChartIcon,
  Download as DownloadIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '@/services/api/campaign';
import { reportsApi } from '@/services/api/reports';
import { CAMPAIGN_STATUSES } from '@/constants';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';
import { DataTable, ColDef } from '@/components/DataTable';
import type { Campaign } from '@/types/dto';

const campaignSchema = yup.object({
  name: yup.string().trim().required('Campaign name is required').min(2, 'Too short'),
  description: yup.string().optional(),
  startDate: yup.string().required('Start date is required'),
  endDate: yup
    .string()
    .required('End date is required')
    .test('after', 'End date must be after start date', function (val: any) {
      const { startDate } = this.parent as any;
      return !val || !startDate || new Date(val) >= new Date(startDate);
    }),
  initialNIDCount: yup
    .number()
    .typeError('Must be a number')
    .min(1, 'Must be at least 1')
    .required('Initial NID count is required'),
  status: yup
    .string()
    .oneOf(['Draft', 'Active', 'Paused', 'Completed', 'Archived'])
    .default('Draft'),
});

const CampaignsPage: React.FC = () => {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [menuState, setMenuState] = useState<{ id: string; el: any } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['campaigns-list', statusFilter],
    queryFn: async () => {
      const res = await campaignsApi.list({ pageSize: 100 });
      if (statusFilter) res.data = res.data.filter((c) => c.status === statusFilter);
      return res;
    },
  });

  const form = useForm<any>({
    resolver: yupResolver(campaignSchema as any),
    defaultValues: { status: 'Draft' },
  });

  const create = useMutation({
    mutationFn: (v: any) =>
      editing ? campaignsApi.update(editing.id as any, v) : campaignsApi.create(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns-list'] });
      setDialogOpen(false);
      setEditing(null);
      form.reset({ status: 'Draft' });
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Campaign['status'] }) =>
      campaignsApi.changeStatus(id as any, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns-list'] }),
  });

  const exportCampaign = useMutation({
    mutationFn: (id: string) => reportsApi.campaignReport(id as any, 'csv'),
  });

  const cols: ColDef<Campaign>[] = [
    {
      field: 'name',
      header: 'Campaign',
      minWidth: 240,
      render: (c) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: (t) => `${t.palette.primary.main}18`,
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChartIcon sx={{ fontSize: 16 }} />
          </Box>
          <Box minWidth={0}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {c.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {c.description ?? 'No description'}
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
      render: (c) => {
        const m = CAMPAIGN_STATUSES.find((s) => s.value === c.status);
        return (
          <Chip
            label={m?.label ?? c.status}
            color={(m?.color ?? 'default') as any}
            size="small"
            variant={m?.color === 'default' ? 'outlined' : 'filled'}
          />
        );
      },
    },
    {
      field: 'startDate',
      header: 'Duration',
      minWidth: 240,
      render: (c) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">
            {formatDate(c.startDate)} → {formatDate(c.endDate)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(c.createdAt, true)}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'initialNIDCount',
      header: 'Initial NID Target',
      align: 'right',
      render: (c) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatNumber(c.initialNIDCount)}
        </Typography>
      ),
    },
    {
      field: '_actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (c) => (
        <>
          <Tooltip title="View details">
            <IconButton size="small" color="inherit" onClick={() => nav(`/campaigns/${c.id}`)}>
              <OpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download report">
            <IconButton
              size="small"
              color="inherit"
              onClick={() => exportCampaign.mutate(String(c.id))}
              disabled={exportCampaign.isPending}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Options">
            <IconButton
              size="small"
              color="inherit"
              onClick={(e) => setMenuState({ id: String(c.id), el: e.currentTarget })}
            >
              <DotsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            open={menuState?.id === String(c.id)}
            anchorEl={menuState?.el}
            onClose={() => setMenuState(null)}
          >
            <MenuItem
              onClick={() => {
                setMenuState(null);
                setEditing(c);
                form.reset({ ...c });
                setDialogOpen(true);
              }}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit campaign
            </MenuItem>
            {c.status !== 'Active' && c.status !== 'Completed' && c.status !== 'Archived' ? (
              <MenuItem
                onClick={() => {
                  setMenuState(null);
                  changeStatus.mutate({ id: String(c.id), status: 'Active' });
                }}
              >
                <PlayIcon fontSize="small" sx={{ mr: 1 }} /> Activate
              </MenuItem>
            ) : null}
            {c.status === 'Active' ? (
              <MenuItem
                onClick={() => {
                  setMenuState(null);
                  changeStatus.mutate({ id: String(c.id), status: 'Paused' });
                }}
              >
                <PauseIcon fontSize="small" sx={{ mr: 1 }} /> Pause
              </MenuItem>
            ) : null}
            {c.status !== 'Completed' && c.status !== 'Archived' ? (
              <MenuItem
                onClick={() => {
                  setMenuState(null);
                  changeStatus.mutate({ id: String(c.id), status: 'Completed' });
                }}
              >
                <CheckIcon fontSize="small" sx={{ mr: 1 }} /> Mark completed
              </MenuItem>
            ) : null}
            {c.status !== 'Archived' ? (
              <MenuItem
                onClick={() => {
                  setMenuState(null);
                  changeStatus.mutate({ id: String(c.id), status: 'Archived' });
                }}
                sx={{ color: 'text.secondary' }}
              >
                <ArchiveIcon fontSize="small" sx={{ mr: 1 }} /> Archive
              </MenuItem>
            ) : null}
          </Menu>
        </>
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
            Campaigns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, manage and monitor voter registration campaigns
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by status</InputLabel>
            <Select
              label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All statuses</MenuItem>
              {CAMPAIGN_STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              form.reset({ status: 'Draft', name: '', description: '', initialNIDCount: 1 });
              setDialogOpen(true);
            }}
          >
            New Campaign
          </Button>
        </Stack>
      </Stack>

      {changeStatus.isError && (
        <Alert severity="warning">Status update failed — refresh and try again.</Alert>
      )}

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                All Campaigns
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatNumber(data?.total ?? 0)} total
              </Typography>
            </Box>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <DataTable
            rows={data?.data ?? []}
            columns={cols}
            getRowId={(r) => r.id}
            pageSize={25}
            loading={isLoading || isFetching || changeStatus.isPending}
          />
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
          form.reset();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editing ? 'Edit Campaign' : 'Create New Campaign'}
        </DialogTitle>
        <Divider />
        <form
          onSubmit={form.handleSubmit((v) => {
            create.mutate(v);
          })}
        >
          <DialogContent>
            <Grid container spacing={2} pt={0.5}>
              <Grid xs={12} md={7}>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Campaign Name"
                      fullWidth
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message as any}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} md={5}>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth size="small" error={!!fieldState.error}>
                      <InputLabel>Initial Status</InputLabel>
                      <Select label="Initial Status" {...field}>
                        {CAMPAIGN_STATUSES.map((s) => (
                          <MenuItem key={s.value} value={s.value}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid xs={12}>
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <TextField {...field} label="Description" fullWidth size="small" multiline rows={2} />
                  )}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <Controller
                  name="startDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Start Date"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message as any}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <Controller
                  name="endDate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="End Date"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message as any}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <Controller
                  name="initialNIDCount"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Initial NID Count (Target)"
                      type="number"
                      fullWidth
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message as any}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setDialogOpen(false);
                setEditing(null);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>
              {create.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              {editing ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
};

export default CampaignsPage;
