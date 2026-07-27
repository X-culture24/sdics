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
  LockOpen as ResetIcon,
  MoreVert as DotsIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUnitsApi, usersApi } from '@/services/api/users';
import { formatDate } from '@/utils/format';
import { DataTable, ColDef } from '@/components/DataTable';
import type { Role, User } from '@/types/dto';
import { ROLE_NAMES } from '@/constants';

const userSchema = yup.object({
  fullName: yup.string().trim().min(2).required('Required'),
  email: yup.string().trim().email('Invalid email').required('Required'),
  phoneNumber: yup.string().optional(),
  roleId: yup.string().required('Role is required'),
  adminUnitId: yup.string().optional(),
  isActive: yup.boolean().default(true),
  password: yup
    .string()
    .optional()
    .when('$isEdit', (isEdit, schema) =>
      isEdit ? schema : schema.min(8, 'Min. 8 characters').required('Password is required'),
    ),
});

const UsersPage: React.FC = () => {
  const qc = useQueryClient();
  const [menuState, setMenuState] = useState<{ id: string; el: any } | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [q, setQ] = useState('');

  const users = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => (await usersApi.list({ pageSize: 500 })).data,
  });
  const roles = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => usersApi.listRoles(),
  });
  const units = useQuery({
    queryKey: ['admin-units-users'],
    queryFn: async () => (await adminUnitsApi.list({ pageSize: 9999 })).data,
    staleTime: 120_000,
  });

  const form = useForm<any>({
    resolver: yupResolver(userSchema as any),
    context: { isEdit: Boolean(editing) },
    defaultValues: { isActive: true },
  });

  const upsert = useMutation({
    mutationFn: (v: any) =>
      editing
        ? usersApi.update(editing.id as any, v)
        : usersApi.create({
            email: v.email,
            fullName: v.fullName,
            roleId: v.roleId,
            phoneNumber: v.phoneNumber,
            adminUnitId: v.adminUnitId,
            password: v.password,
            isActive: true,
          } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      setDialogOpen(false);
      setEditing(null);
      form.reset({ isActive: true });
    },
  });

  const toggleActive = useMutation({
    mutationFn: (u: User) => usersApi.setActive(u.id as any, !u.isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users-list'] }),
  });

  const resetPwd = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id as any, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      setResetFor(null);
    },
  });

  const userRows = Array.isArray(users.data) ? users.data : [];
  const roleRows = Array.isArray(roles.data) ? roles.data : [];
  const unitRows = Array.isArray(units.data) ? units.data : [];

  const filtered = userRows.filter((u) => {
    if (q) {
      const s = q.toLowerCase();
      if (
        !u.email.toLowerCase().includes(s) &&
        !u.fullName.toLowerCase().includes(s)
      )
        return false;
    }
    if (roleFilter && u.roleId !== roleFilter) return false;
    if (unitFilter && u.adminUnitId !== unitFilter) return false;
    return true;
  });

  const roleById: Record<string, Role | undefined> = Object.fromEntries(
    roleRows.map((r) => [String(r.id), r]),
  );
  const unitById: Record<string, any> = Object.fromEntries(
    unitRows.map((u) => [String(u.id), u]),
  );

  const cols: ColDef<User>[] = [
    {
      field: 'fullName',
      header: 'Officer',
      minWidth: 260,
      render: (u) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {u.fullName?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'}
          </Box>
          <Box minWidth={0}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {u.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {u.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'roleId',
      header: 'Role',
      minWidth: 220,
      render: (u) => {
        const r = roleById[String(u.roleId)];
        const name = r?.name ?? u.role?.name ?? 'Unknown';
        return <Chip size="small" label={name} color="primary" variant="outlined" />;
      },
    },
    {
      field: 'adminUnitId',
      header: 'Admin Unit',
      minWidth: 180,
      render: (u) => (
        <Typography variant="body2" noWrap>
          {u.adminUnit
            ? u.adminUnit.name
            : unitById[String(u.adminUnitId ?? '')]?.name ??
              (u.role?.name === 'System Administrator' ? 'National' : '—')}
        </Typography>
      ),
    },
    {
      field: 'isActive',
      header: 'Status',
      align: 'center',
      minWidth: 140,
      render: (u) => (
        u.isActive ? (
          <Chip
            size="small"
            label={<Stack direction="row" spacing={0.5} alignItems="center"><ActiveIcon sx={{ fontSize: 14 }} />Active</Stack>}
            color="success"
          />
        ) : (
          <Chip
            size="small"
            label={<Stack direction="row" spacing={0.5} alignItems="center"><InactiveIcon sx={{ fontSize: 14 }} />Inactive</Stack>}
            color="default"
          />
        )
      ),
    },
    {
      field: 'createdAt',
      header: 'Created',
      minWidth: 160,
      render: (u) => <Typography variant="body2">{formatDate(u.createdAt, true)}</Typography>,
    },
    {
      field: '_actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (u) => (
        <>
          <Tooltip title="Reset password">
            <Button
              variant="text"
              size="small"
              color="primary"
              onClick={() => setResetFor(u)}
            >
              <ResetIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="More">
            <Button
              size="small"
              variant="text"
              onClick={(e) => setMenuState({ id: String(u.id), el: e.currentTarget })}
            >
              <DotsIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Menu
            open={menuState?.id === String(u.id)}
            anchorEl={menuState?.el}
            onClose={() => setMenuState(null)}
          >
            <MenuItem
              onClick={() => {
                setMenuState(null);
                setEditing(u);
                form.reset({ ...u, adminUnitId: u.adminUnitId ?? '', roleId: u.roleId });
                setDialogOpen(true);
              }}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Edit user
            </MenuItem>
            <MenuItem onClick={() => { setMenuState(null); toggleActive.mutate(u); }}>
              {u.isActive ? <> <InactiveIcon sx={{ mr: 1 }} /> Deactivate user </> : <> <ActiveIcon sx={{ mr: 1 }} /> Activate user </>}
            </MenuItem>
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
            Users & Roles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage officer accounts, roles, and administrative unit access.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            form.reset({ isActive: true, fullName: '', email: '', phoneNumber: '', roleId: '', adminUnitId: '' });
            setDialogOpen(true);
          }}
        >
          New User
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search name or email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ flex: { md: 1 }, maxWidth: { md: 360 } }}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value="">All roles</MenuItem>
                {roleRows.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Admin Unit</InputLabel>
              <Select label="Admin Unit" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                <MenuItem value="">All units</MenuItem>
                {unitRows.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} · L{u.level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <DataTable
            rows={filtered}
            columns={cols}
            getRowId={(r) => r.id}
            pageSize={25}
            loading={users.isLoading || toggleActive.isPending || upsert.isPending}
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editing ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <Divider />
        <form onSubmit={form.handleSubmit((v) => upsert.mutate(v))}>
          <DialogContent>
            <Grid container spacing={2} pt={0.5}>
              <Grid xs={12} md={6}>
                <Controller
                  name="fullName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Full Name"
                      fullWidth
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message as any}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Email"
                      fullWidth
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message as any}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="roleId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth size="small" error={!!fieldState.error}>
                      <InputLabel>Role</InputLabel>
                      <Select label="Role" {...field}>
                        {roleRows.map((r) => (
                          <MenuItem key={r.id} value={r.id}>
                            {r.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="phoneNumber"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Phone"
                      fullWidth
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message as any}
                    />
                  )}
                />
              </Grid>
              <Grid xs={12} md={6}>
                <Controller
                  name="adminUnitId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth size="small" error={!!fieldState.error}>
                      <InputLabel>Assigned Unit (optional)</InputLabel>
                      <Select label="Assigned Unit (optional)" {...field} value={field.value ?? ''}>
                        <MenuItem value="">None (National / SysAdmin)</MenuItem>
                        {unitRows.map((u) => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.name} · L{u.level}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              {!editing && (
                <Grid xs={12} md={6}>
                  <Controller
                    name="password"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Temporary Password"
                        type="password"
                        fullWidth
                        size="small"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message as any}
                      />
                    )}
                  />
                </Grid>
              )}
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
            <Button type="submit" variant="contained" disabled={upsert.isPending}>
              {upsert.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              {editing ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(resetFor)} onClose={() => setResetFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Reset Password</DialogTitle>
        <Divider />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            resetPwd.mutate({ id: String(resetFor?.id), password: String(fd.get('password')) });
          }}
        >
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Resetting the password for <b>{resetFor?.fullName}</b> ({resetFor?.email}).
            </Alert>
            <TextField
              name="password"
              label="New temporary password"
              size="small"
              fullWidth
              type="password"
              defaultValue="Admin@123456"
              autoComplete="new-password"
              inputProps={{ minLength: 8 }}
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="outlined" onClick={() => setResetFor(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={resetPwd.isPending}>
              {resetPwd.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Reset Password
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
};

export default UsersPage;
