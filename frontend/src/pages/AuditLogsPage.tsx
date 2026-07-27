import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '@/services/api/settings';
import { DataTable, ColDef } from '@/components/DataTable';
import type { AuditLog } from '@/types/dto';
import { formatDate } from '@/utils/format';

const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const logs = useQuery({
    queryKey: ['audit-logs', page, pageSize, action, search],
    queryFn: () =>
      auditLogsApi.list({
        page,
        pageSize,
        action: action || undefined,
        entityType: search || undefined,
      }),
  });

  const cols = useMemo<ColDef<AuditLog>[]>(
    () => [
      { field: 'action', header: 'Action', minWidth: 180 },
      { field: 'entityType', header: 'Entity', minWidth: 160 },
      { field: 'ipAddress', header: 'IP Address', minWidth: 140 },
      { field: 'createdAt', header: 'Timestamp', minWidth: 180, render: (r) => formatDate(r.createdAt, true) },
    ],
    [],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          Audit Logs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review user actions, administrative changes, and recent system activity.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              size="small"
              label="Search entity"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Action</InputLabel>
              <Select label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
                <MenuItem value="">All actions</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="login">Login</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {logs.isError ? <Alert severity="warning">Could not load audit logs.</Alert> : null}

          <DataTable
            rows={logs.data?.data ?? []}
            columns={cols}
            loading={logs.isLoading}
            getRowId={(r) => r.id}
            pageSize={pageSize}
            emptyMessage="No audit activity found"
          />
        </CardContent>
      </Card>
    </Stack>
  );
};

export default AuditLogsPage;
