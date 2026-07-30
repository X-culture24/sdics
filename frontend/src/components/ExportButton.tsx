import { Button, CircularProgress, Tooltip } from '@mui/material'
import { Download as DownloadIcon } from '@mui/icons-material'
import { useState } from 'react'
import api from '../api/axios'

interface ExportButtonProps {
  campaignId?: string
  label?: string
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
}

export default function ExportButton({
  campaignId,
  label = 'Export',
  variant = 'outlined',
  size = 'medium',
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    try {
      setIsLoading(true)
      
      const params = campaignId ? `?campaign_id=${campaignId}` : ''
      const response = await api.get(`/sync/citizens/export${params}`, {
        responseType: 'blob',
      })

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `citizens-export-${Date.now()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tooltip title="Download registered citizens as Excel file">
      <Button
        onClick={handleExport}
        variant={variant}
        size={size}
        startIcon={isLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
        disabled={isLoading}
      >
        {label}
      </Button>
    </Tooltip>
  )
}
