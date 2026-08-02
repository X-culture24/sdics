import { useState } from 'react'
import CitizensTable from '@/components/CitizensTable'
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { importService } from '@/services/api/importService.ts'
import { datasetService } from '@/services/api/datasetService.ts'

export default function CitizensPage() {
  const [selectedCounty, setSelectedCounty] = useState<string>('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const queryClient = useQueryClient()

  const normalizeCountyName = (value: string) =>
    value?.toLowerCase().replace(/[-_\s]+/g, ' ').trim()

  const { data: datasetUploads, isLoading: datasetUploadsLoading } = useQuery({
    queryKey: ['dataset-uploads'],
    queryFn: async () => {
      try {
        const response = await datasetService.listDatasets(1, 100)
        return response.data || []
      } catch (err) {
        console.error('Error loading dataset uploads:', err)
        return []
      }
    },
  })

  const { data: counties, isLoading: countiesLoading } = useQuery({
    queryKey: ['admin-units', 'level-2'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin-units', { params: { level: 2 } })
        const countyList = response.data?.data || []
        const availableCountyNames = new Set(
          datasetUploads
            .map((upload: any) => normalizeCountyName(upload.county || ''))
            .filter(Boolean)
        )
        return countyList.filter((county: any) =>
          availableCountyNames.size > 0
            ? availableCountyNames.has(normalizeCountyName(county.name || ''))
            : true
        )
      } catch (err) {
        console.error('Error loading counties:', err)
        return []
      }
    },
  })

  // Import datasets mutation
  const importMutation = useMutation({
    mutationFn: () => importService.startFromDatasets(),
    onSuccess: () => {
      setShowImportDialog(false)
      // Refresh citizens list after import
      queryClient.invalidateQueries({ queryKey: ['citizens'] })
    },
  })

  if (countiesLoading || datasetUploadsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Citizens Management
        </Typography>
        <Button
          variant="outlined"
          onClick={() => setShowImportDialog(true)}
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? 'Importing...' : 'Import Excel Datasets'}
        </Button>
      </Box>

      {/* County Filter */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#FFFFFF' }}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>Select County</InputLabel>
          <Select
            value={selectedCounty}
            onChange={(e: React.ChangeEvent<any>) => setSelectedCounty(e.target.value)}
            label="Select County"
          >
            <MenuItem value="">All Counties</MenuItem>
            {counties && counties.length > 0 ? (
              counties.map((county: any) => (
                <MenuItem key={county.id} value={county.id}>
                  {county.name}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                No counties available
              </MenuItem>
            )}
          </Select>
        </FormControl>
      </Paper>

      {!counties || counties.length === 0 ? (
        <Alert severity="info">
          No counties found. Please ensure the backend has loaded admin units from the database.
        </Alert>
      ) : (
        <>
          {/* Citizens Table */}
          <Paper sx={{ backgroundColor: '#FFFFFF' }}>
            <CitizensTable countyId={selectedCounty} />
          </Paper>
        </>
      )}

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onClose={() => setShowImportDialog(false)}>
        <DialogTitle>Import Excel Datasets</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2">
            This will import all citizen data from Excel files in the ./datasets folder. 
            Duplicate national IDs will be skipped. This process may take a few minutes for large datasets.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportDialog(false)}>Cancel</Button>
          <Button
            onClick={() => importMutation.mutate()}
            variant="contained"
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing...' : 'Start Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
