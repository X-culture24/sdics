import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

interface BarChartProps {
  data: any[];
}

export default function BarChart({ data }: BarChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
            <TableCell sx={{ fontWeight: 700 }}>District</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Registered</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Target</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>% Complete</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>No data</TableCell>
            <TableCell align="right">0</TableCell>
            <TableCell align="right">0</TableCell>
            <TableCell align="right">0%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
            <TableCell sx={{ fontWeight: 700 }}>District</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Registered</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Target</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>% Complete</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row: any) => {
            const registered = row?.registeredCount ?? row?.registered ?? 0;
            const target = row?.targetCount ?? row?.target ?? 0;
            const percent = target > 0 ? Math.round((registered / target) * 100) : 0;
            const district = row?.districtName ?? row?.name ?? 'Unknown';

            return (
              <TableRow key={district}>
                <TableCell sx={{ fontWeight: 500 }}>{district}</TableCell>
                <TableCell align="right">{(registered ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{(target ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#10B981' }}>
                  {percent}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
