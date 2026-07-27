import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  HowToReg as RegisterIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { citizensApi } from '@/services/api/citizens';
import { reportsApi } from '@/services/api/reports';
import { adminUnitsApi } from '@/services/api/users';
import { campaignsApi } from '@/services/api/campaign';
import { DataTable, ColDef } from '@/components/DataTable';
import { CITIZEN_REG_STATUSES, DEFAULT_PAGE_SIZE } from '@/constants';
import { formatDate, formatPercent } from '@/utils/format';
import type { AdminUnit, Campaign, Citizen, PaginationResponse, RegStatus } from '@/types/dto';

const citizenFormSchema = yup.object({
  nationalId: yup.string().required('National ID is required').trim(),
  fullName: yup.string().required('Full name is required').trim().min(2, 'Too short'),
  gender: yup.string().oneOf(['Male', 'Female']).required('Gender is required'),
  phoneNumber: yup.string().optional(),
  countyId: yup.string().optional(),
  districtId: yup.string().optional(),
  registrationStatus: yup
    .string()
    .oneOf(['Registered', 'Unregistered', 'Pending', 'Ineligible'])
    .default('Unregistered'),
});

const ChipByStatus = (status: string) => {
  const match = CITIZEN_REG_STATUSES.find((s) => s.value === status);
  const color = (match?.color ?? 'default') as any;
  return (
    <Chip label={match?.label ?? status} size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} />
  );
};

const CitizenListPage: React.FC = () => {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const districtsQuery = useQuery<AdminUnit[]>({
    queryKey: ['admin-units-districts'],
    queryFn: async () => {
      try {
        const res = await adminUnitsApi.list({ pageSize: 500 });
        return (res.data ?? []).filter((u: AdminUnit) => u.level === 3 || u.level === 2);
      } catch {
        return [] as AdminUnit[];
      }
    },
    staleTime: 60_000,
  });

  const campaignsQuery = useQuery({
    queryKey: ['campaigns-citizens'],
    queryFn: async () => {
      try {
        const r = await campaignsApi.list({ pageSize: 50 });
        return r.data;
      } catch {
        return [] as Campaign[];
      }
    },
  });

  const list = useQuery<PaginationResponse<Citizen>>({
    queryKey: ['citizens-list', page, pageSize, q, statusFilter, districtFilter],
    queryFn: () =>
      citizensApi.list({
        page,
        pageSize,
        q: q || undefined,
        registrationStatus: statusFilter || undefined,
        districtId: districtFilter || undefined,
      }),
  });

  const stats = useQuery({
    queryKey: ['citizens-stats'],
    queryFn: () => citizensApi.stats(),
    refetchInterval: 60_000,
  });

  const exportCitizens = useMutation({
    mutationFn: (format: 'csv' | 'xlsx') =>
      reportsApi.exportCitizens({
        format,
        registrationStatus: statusFilter || undefined,
        districtId: districtFilter || undefined,
      }),
  });

  const cols: ColDef<Citizen>[] = useMemo(
    () => [
      {
        field: 'fullName',
        header: 'Citizen',
        minWidth: 260,
        render: (c) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: c.gender === 'Female' ? 'rgba(236, 72, 153, 0.15)' : 'primary.main',
                color: c.gender === 'Female' ? '#ec4899' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {c.fullName?.[0]?.toUpperCase() ?? 'U'}
            </Box>
            <Box minWidth={0}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                {c.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                ID: <b>{c.nationalId}</b> · {c.gender}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        field: 'registrationStatus',
        header: 'Status',
        minWidth: 140,
        align: 'center',
        render: (c) => ChipByStatus(c.registrationStatus),
      },
      {
        field: 'registrationDate',
        header: 'Reg. Date',
        align: 'right',
        render: (c) => <Typography variant="body2">{formatDate(c.registrationDate)}</Typography>,
      },
      {
        field: 'district',
        header: 'District',
        minWidth: 160,
        render: (c) => (
          <Typography variant="body2" noWrap>
            {c.district?.name ?? (c.districtId || '—')}
          </Typography>
        ),
      },
      {
        field: 'location',
        header: 'Location',
        minWidth: 160,
        render: (c) => (
          <Typography variant="body2" noWrap>
            {c.location?.name ?? c.subLocation?.name ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'pollingStation',
        header: 'Polling Station',
        minWidth: 180,
        render: (c) => <Typography variant="body2">{c.pollingStation ?? '—'}</Typography>,
      },
      {
        field: '_actions',
        header: 'Actions',
        align: 'right',
        sortable: false,
        render: (c) => (
          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
            <Tooltip title="Register citizen">
              <IconButton size="small" color="success">
                <RegisterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open details">
              <IconButton size="small" color="inherit" onClick={() => nav(`/citizens/${c.id}`)}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [nav],
  );

  const form = useForm<any>({
    resolver: yupResolver(citizenFormSchema as any),
    defaultValues: {
      registrationStatus: 'Unregistered',
      gender: 'Male',
    },
  });

  const create = useMutation({
    mutationFn: (v: any) => citizensApi.create(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizens-list'] });
      qc.invalidateQueries({ queryKey: ['citizens-stats'] });
      setCreateOpen(false);
      form.reset();
    },
  });

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
            Citizens
          </Typography>
          <Typography variant="body2" color="text.secondary">
            National ID holders and voter registration status
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New Citizen
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => nav('/imports')}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={(e) => setMenuAnchor(e.currentTarget as any)}
          >
            Export
          </Button>
          <Menu open={Boolean(menuAnchor)} anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem
              disabled={exportCitizens.isPending}
              onClick={() => {
                setMenuAnchor(null);
                exportCitizens.mutate('csv');
              }}
            >
              Export as CSV
            </MenuItem>
            <MenuItem
              disabled={exportCitizens.isPending}
              onClick={() => {
                setMenuAnchor(null);
                exportCitizens.mutate('xlsx');
              }}
            >
              Export as Excel
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {stats.isSuccess && (
        <Grid container spacing={2}>
          {[
            { label: 'Total Citizens', color: 'primary', value: stats.data.total },
            { label: 'Registered', color: 'success', value: stats.data.registered },
            { label: 'Not Registered', color: 'warning', value: stats.data.unregistered },
            { label: 'Pending', color: 'info', value: stats.data.pending },
            { label: 'Ineligible', color: 'error', value: stats.data.ineligible },
            {
              label: 'Completion %',
              color: 'secondary',
              value: formatPercent(
                stats.data.total
                  ? (stats.data.registered / stats.data.total) * 100
                  : 0,
              ),
            },
          ].map((kpi) => (
            <Grid key={kpi.label} xs={6} sm={4} md={2}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: (t) => `${t.palette[kpi.color as 'primary'].main}12`,
                  border: (t) => `1px solid ${t.palette[kpi.color as 'primary'].main}30`,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {kpi.label.toUpperCase()}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {kpi.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{
          p: 1.5,
          borderRadius: 3,
          bgcolor: (t) => `${t.palette.primary.main}08`,
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <TextField
          size="small"
          placeholder="Search National ID, name, village..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ flex: { md: 1 }, maxWidth: { md: 420 } }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Registration Status</InputLabel>
          <Select label="Registration Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All statuses</MenuItem>
            {CITIZEN_REG_STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>District / County</InputLabel>
          <Select label="District / County" value={districtFilter} onChange={(e) => { setDistrictFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All regions</MenuItem>
            {(districtsQuery.data ?? [])
              .sort((a: AdminUnit, b: AdminUnit) => a.name.localeCompare(b.name))
              .map((u: AdminUnit) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} · L{u.level}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<FilterIcon />} onClick={() => { setQ(''); setStatusFilter(''); setDistrictFilter(''); setPage(1); }}>
          Clear
        </Button>
      </Stack>

      {list.isError && (
        <Alert severity="warning">
          Couldn't load citizens. Refresh the page or try again.
        </Alert>
      )}

      <DataTable
        rows={list.data?.data ?? []}
        columns={cols}
        loading={list.isLoading || list.isFetching}
        onRowClick={(r) => nav(`/citizens/${r.id}`)}
        getRowId={(r) => r.id}
        pageSize={pageSize}
        emptyMessage="No citizens match the current filters"
      />

      <CreateCitizenDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(v) => create.mutate(v)}
        loading={create.isPending}
        form={form}
        adminUnits={districtsQuery.data ?? []}
      />
    </Stack>
  );
};

const CreateCitizenDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (v: any) => void;
  loading?: boolean;
  form: ReturnType<typeof useForm<any>>;
  adminUnits: AdminUnit[];
}> = ({ open, onClose, onSubmit, loading, form, adminUnits }) => {
  const { control, handleSubmit, reset } = form;

  const counties = useMemo(() => adminUnits.filter((u) => u.level === 2), [adminUnits]);
  const [countyId, setCountyId] = React.useState<string>('');
  const districts = useMemo(
    () => adminUnits.filter((u) => u.level === 3 && (countyId ? u.parentId === countyId : true)),
    [adminUnits, countyId],
  );

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Register New Citizen</DialogTitle>
      <Divider />
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2} pt={0.5}>
            <Grid xs={12} md={6}>
              <Controller
                name="nationalId"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="National ID"
                    fullWidth
                    size="small"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <Controller
                name="fullName"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Full Name"
                    fullWidth
                    size="small"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid xs={12} md={3}>
              <Controller
                name="gender"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl size="small" fullWidth error={Boolean(fieldState.error)}>
                    <InputLabel>Gender</InputLabel>
                    <Select label="Gender" {...field}>
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid xs={12} md={5}>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Phone Number (optional)"
                    fullWidth
                    size="small"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid xs={12} md={4}>
              <Controller
                name="registrationStatus"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl size="small" fullWidth error={Boolean(fieldState.error)}>
                    <InputLabel>Registration Status</InputLabel>
                    <Select label="Registration Status" {...field}>
                      {CITIZEN_REG_STATUSES.map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>County (optional)</InputLabel>
                <Select
                  label="County (optional)"
                  value={countyId}
                  onChange={(e) => setCountyId(String(e.target.value))}
                >
                  <MenuItem value="">None</MenuItem>
                  {counties.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={6}>
              <Controller
                name="districtId"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl size="small" fullWidth error={Boolean(fieldState.error)}>
                    <InputLabel>District / Sub-county (optional)</InputLabel>
                    <Select label="District / Sub-county (optional)" {...field} value={field.value ?? ''}>
                      <MenuItem value="">None</MenuItem>
                      {districts.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Save Citizen
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CitizenListPage;
