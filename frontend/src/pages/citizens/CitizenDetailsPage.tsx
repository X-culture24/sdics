import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  HowToReg as RegisterIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { citizensApi } from '@/services/api/citizens';
import { campaignsApi } from '@/services/api/campaign';
import { CITIZEN_REG_STATUSES, CAMPAIGN_STATUSES } from '@/constants';
import { formatDate } from '@/utils/format';
import { Controller, useForm } from 'react-hook-form';
import type { Citizen, Campaign } from '@/types/dto';

const ChipByStatus = (status: string) => {
  const match = CITIZEN_REG_STATUSES.find((s) => s.value === status);
  const color = (match?.color ?? 'default') as any;
  return (
    <Chip label={match?.label ?? status} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />
  );
};

const CitizenDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const details = useQuery({
    queryKey: ['citizen', id],
    queryFn: () => citizensApi.get(id as any),
    enabled: !!id,
  });

  const campaigns = useQuery({
    queryKey: ['active-campaigns-for-register'],
    queryFn: async () => {
      try {
        const r = await campaignsApi.list({ pageSize: 50 });
        return (r.data ?? []).filter((c) => c.status === 'Active');
      } catch {
        return [] as Campaign[];
      }
    },
  });

  const c: Citizen | undefined = details.data;

  const form = useForm<any>({
    values: {
      fullName: c?.fullName,
      phoneNumber: c?.phoneNumber ?? '',
      registrationStatus: c?.registrationStatus ?? 'Unregistered',
      pollingStation: c?.pollingStation ?? '',
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const update = useMutation({
    mutationFn: (v: any) => citizensApi.update(id as any, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen'] });
      qc.invalidateQueries({ queryKey: ['citizens-list'] });
      setEditMode(false);
    },
  });

  const register = useMutation({
    mutationFn: (data: { campaignId: string; source: string }) =>
      citizensApi.register(id as any, {
        campaignId: data.campaignId as any,
        source: data.source,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['citizen'] });
      qc.invalidateQueries({ queryKey: ['citizens-list'] });
      qc.invalidateQueries({ queryKey: ['kpi'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setRegisterOpen(false);
    },
  });

  if (details.isLoading)
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 360 }}>
        <CircularProgress />
      </Stack>
    );

  if (details.isError || !c) {
    return (
      <Alert severity="error" action={<Button onClick={() => nav('/citizens')}>Go back</Button>}>
        Citizen not found or you don't have access.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton onClick={() => nav('/citizens')} color="inherit">
            <BackIcon />
          </IconButton>
          <Stack direction="row" spacing={1.75} alignItems="center">
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: c.gender === 'Female' ? '#ec4899' : 'primary.main',
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {c.fullName?.[0]?.toUpperCase() ?? 'U'}
            </Avatar>
            <Box minWidth={0}>
              <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }} noWrap>
                {c.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                NID · <b>{c.nationalId}</b> · {c.gender}
              </Typography>
            </Box>
            {ChipByStatus(c.registrationStatus)}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {c.registrationStatus !== 'Registered' ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<RegisterIcon />}
              onClick={() => setRegisterOpen(true)}
              disabled={!campaigns.data?.length}
            >
              Mark Registered
            </Button>
          ) : (
            <Tooltip title="Citizen already registered">
              <Button
                variant="outlined"
                color="success"
                startIcon={<RegisterIcon />}
                onClick={() => setRegisterOpen(true)}
              >
                Re-register / Edit
              </Button>
            </Tooltip>
          )}
          <Button
            variant="outlined"
            startIcon={editMode ? <SaveIcon /> : <EditIcon />}
            onClick={() => {
              if (editMode) {
                form.handleSubmit((v) => update.mutate(v))();
              } else {
                setEditMode(true);
              }
            }}
            disabled={update.isPending}
          >
            {editMode ? 'Save Changes' : 'Edit Citizen'}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Personal Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <Controller
                    name="fullName"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Full Name"
                        fullWidth
                        size="small"
                        variant={editMode ? 'outlined' : 'filled'}
                        InputProps={{ readOnly: !editMode }}
                      />
                    )}
                  />
                </Grid>
                <Grid xs={6} sm={3}>
                  <TextField
                    label="National ID"
                    value={c.nationalId}
                    fullWidth
                    size="small"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid xs={6} sm={3}>
                  <TextField
                    label="Gender"
                    value={c.gender}
                    fullWidth
                    size="small"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <Controller
                    name="phoneNumber"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Phone Number"
                        fullWidth
                        size="small"
                        variant={editMode ? 'outlined' : 'filled'}
                        InputProps={{ readOnly: !editMode }}
                      />
                    )}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <Controller
                    name="pollingStation"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Polling Station"
                        fullWidth
                        size="small"
                        variant={editMode ? 'outlined' : 'filled'}
                        InputProps={{ readOnly: !editMode }}
                      />
                    )}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <Controller
                    name="registrationStatus"
                    control={form.control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small">
                        <InputLabel>Registration Status</InputLabel>
                        <Select
                          label="Registration Status"
                          {...field}
                          variant={editMode ? 'outlined' : 'filled'}
                          readOnly={!editMode}
                        >
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
                <Grid xs={12} sm={6}>
                  <TextField
                    label="Registration Date"
                    value={formatDate(c.registrationDate)}
                    fullWidth
                    size="small"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={4}>
          <Card sx={{ mb: 2.5 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Administrative Region
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.75}>
                {[
                  ['County', c.county?.name ?? '—'],
                  ['District / Sub-county', c.district?.name ?? '—'],
                  ['Division', c.division?.name ?? '—'],
                  ['Location', c.location?.name ?? '—'],
                  ['Sub-location', c.subLocation?.name ?? '—'],
                  ['Village / Settlement', c.village?.name ?? '—'],
                ].map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {k.toUpperCase()}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                      {v}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Record Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                {[
                  ['Created', formatDate(c.createdAt, true)],
                  ['Last Updated', formatDate(c.updatedAt, true)],
                ].map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {k.toUpperCase()}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {v}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={registerOpen} onClose={() => setRegisterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Register Citizen to Campaign</DialogTitle>
        <Divider />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            register.mutate({
              campaignId: String(fd.get('campaignId')),
              source: String(fd.get('source') ?? 'Field Registration'),
            });
          }}
        >
          <DialogContent>
            <Stack spacing={2} pt={0.5}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Active Campaign</InputLabel>
                <Select label="Active Campaign" name="campaignId" defaultValue={campaigns.data?.[0]?.id ?? ''}>
                  {(campaigns.data ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{c.name}</span>
                        <Chip size="small" label={c.status} color="success" variant="outlined" />
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                name="source"
                label="Source / Remarks"
                defaultValue="Field Registration"
                fullWidth
                placeholder="e.g. Door-to-door drive"
              />
              {campaigns.data?.length === 0 && campaigns.isFetchedAfterMount ? (
                <Alert severity="warning">There are no active campaigns. Ask an admin to create one.</Alert>
              ) : null}
              {register.isError && (
                <Alert severity="error">Registration failed — please try again.</Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="outlined" onClick={() => setRegisterOpen(false)} startIcon={<CancelIcon />}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              startIcon={<RegisterIcon />}
              disabled={register.isPending || campaigns.data?.length === 0}
            >
              {register.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Confirm Registration
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
};

export default CitizenDetailsPage;
