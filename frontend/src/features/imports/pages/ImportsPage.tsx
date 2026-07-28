import { Box, Card, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

export default function ImportsPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Data Imports</Typography>
        <Button variant="contained" startIcon={<UploadIcon />}>
          Upload File
        </Button>
      </Box>

      <Card sx={{ p: 3, mb: 3, textAlign: 'center', border: '2px dashed #E5E7EB', cursor: 'pointer' }}>
        <UploadIcon sx={{ fontSize: 48, color: '#0056A6', mb: 1 }} />
        <Typography variant="h4" sx={{ mb: 1 }}>
          Drag and drop Excel file here
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280' }}>
          or click to select file
        </Typography>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F6F8FB' }}>
                <TableCell sx={{ fontWeight: 700 }}>Filename</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Total Rows</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Inserted</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Rejected</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#6B7280' }}>
                  No imports yet
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
