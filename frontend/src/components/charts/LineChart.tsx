import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

interface LineChartProps {
  data: any[];
}

export default function LineChart({ data }: LineChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Registrations</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trend</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>No data</TableCell>
                <TableCell align="right">0</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  const counts = data.map((d) => d?.count ?? 0).filter((c) => c > 0);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 1;

  return (
    <Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Registrations</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Trend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row: any) => {
              const count = row?.count ?? 0;
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const date = row?.date ? new Date(row.date).toLocaleDateString() : 'Unknown';

              return (
                <TableRow key={date}>
                  <TableCell sx={{ fontWeight: 500 }}>{date}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {(count ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: `${barWidth}%`,
                        height: 24,
                        backgroundColor: '#0056A6',
                        borderRadius: 1,
                        minWidth: barWidth > 0 ? 10 : 0,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
