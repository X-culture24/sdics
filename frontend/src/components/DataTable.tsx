import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Search as SearchIcon, Tune as TuneIcon } from '@mui/icons-material';

export interface ColDef<T> {
  field: keyof T | string;
  header: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  getValue?: (row: T) => any;
  flex?: number;
}

interface Props<T> {
  rows: T[];
  columns: ColDef<T>[];
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  searchFields?: (keyof T | string)[];
  searchPlaceholder?: string;
  getRowId: (r: T) => string | number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  extraHeader?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  loading,
  emptyMessage = 'No data available',
  pageSize = 25,
  searchFields,
  searchPlaceholder = 'Search...',
  getRowId,
  onRowClick,
  selectable,
  extraHeader,
}: Props<T>) {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    let arr = [...rows];
    const s = q.trim().toLowerCase();
    if (s) {
      const fields = (searchFields && searchFields.length ? searchFields : columns.map((c) => c.field)) as (keyof T)[];
      arr = arr.filter((row) =>
        fields.some((f) => String(row[f] ?? '').toLowerCase().includes(s)),
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.field === sortKey);
      if (col) {
        const accessor = (r: T) => (col.getValue ? col.getValue(r) : col.render ? null : r[col.field as keyof T]);
        arr.sort((a, b) => {
          const va = accessor(a);
          const vb = accessor(b);
          if (va == null && vb == null) return 0;
          if (va == null) return sortDir === 'asc' ? -1 : 1;
          if (vb == null) return sortDir === 'asc' ? 1 : -1;
          if (typeof va === 'number' && typeof vb === 'number') {
            return sortDir === 'asc' ? va - vb : vb - va;
          }
          const sa = String(va).toLowerCase();
          const sb = String(vb).toLowerCase();
          const cmp = sa < sb ? -1 : sa > sb ? 1 : 0;
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return arr;
  }, [rows, q, sortKey, sortDir, searchFields, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const paged = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const toggleSort = (field: string) => {
    if (sortKey === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(field);
      setSortDir('asc');
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        mb={2}
      >
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            ),
          }}
          sx={{ flex: { sm: 1 }, maxWidth: { sm: 360 } }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          {extraHeader}
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            {filtered.length} {filtered.length === 1 ? 'row' : 'rows'}
          </Typography>
          <IconButton size="small" color="default">
            <TuneIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ position: 'relative' }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 340 }}>
            <CircularProgress />
            <Typography variant="caption" color="text.secondary" mt={1.5}>
              Loading data...
            </Typography>
          </Stack>
        ) : paged.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240, py: 6 }}>
            <Chip label={emptyMessage} variant="outlined" />
          </Stack>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableCell
                    key={String(c.field)}
                    align={c.align ?? 'left'}
                    sx={{
                      minWidth: c.minWidth,
                      flex: c.flex,
                      cursor: c.sortable !== false ? 'pointer' : 'default',
                      '&:hover': c.sortable !== false ? { bgcolor: 'action.hover' } : undefined,
                      userSelect: 'none',
                    }}
                    onClick={() => c.sortable !== false && toggleSort(String(c.field))}
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={c.align ?? 'left'}>
                      <Typography variant="subtitle2">{c.header}</Typography>
                      {sortKey === c.field ? (
                        <Chip
                          label={sortDir === 'asc' ? 'A-Z' : 'Z-A'}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow
                    hover
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={String(id) + '_' + String(c.field)}
                        align={c.align ?? 'left'}
                        sx={{ verticalAlign: 'middle' }}
                      >
                        {c.render
                          ? c.render(row)
                          : (
                            <Typography variant="body2">
                              {String((row as any)[c.field] ?? '—')}
                            </Typography>
                          )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" mt={2.5}>
          <Pagination
            size="small"
            shape="rounded"
            page={pageSafe}
            count={totalPages}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Stack>
      )}
    </Box>
  );
}

export default DataTable;
