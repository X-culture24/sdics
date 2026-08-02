import client from './client'

export interface DatasetUpload {
  id: string
  county: string
  filename: string
  uploaded_by: string
  upload_date: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Archived'
  row_count: number
  error_message?: string
  archived_file_path?: string
  created_at: string
  updated_at: string
}

export interface DatasetRecord {
  id: string
  upload_id: string
  row_number: number
  national_id?: string
  full_name?: string
  gender?: string
  phone_number?: string
  county?: string
  district?: string
  division?: string
  location?: string
  sub_location?: string
  village?: string
  polling_station?: string
  registration_status?: string
  registration_date?: string
  extra_data?: Record<string, any>
  is_edited: boolean
  edited_by?: string
  edited_at?: string
  is_synced: boolean
  synced_citizen_id?: string
  sync_error?: string
  created_at: string
  updated_at: string
}

export interface DatasetValidationError {
  id: string
  upload_id: string
  row_number: number
  field_name?: string
  error_message: string
  error_severity: 'WARNING' | 'ERROR' | 'INFO'
  created_at: string
}

export interface DatasetListResult {
  records: DatasetRecord[]
  total: number
  page: number
  page_size: number
  total_page: number
}

export interface DatasetListParams {
  county?: string
  district?: string
  gender?: string
  registration_status?: string
  national_id?: string
  name?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'ASC' | 'DESC'
}

export const datasetService = {
  // Upload a dataset
  async upload(file: File, county: string): Promise<DatasetUpload> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('county', county)

    const response = await client.post<DatasetUpload>('/datasets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // List all datasets
  async listDatasets(page = 1, pageSize = 20): Promise<{ data: DatasetUpload[]; total: number; page: number; page_size: number; total_page: number }> {
    const response = await client.get<{ data: DatasetUpload[]; total: number; page: number; page_size: number; total_page: number }>(
      '/datasets',
      {
        params: { page, page_size: pageSize },
      }
    )
    return response.data
  },

  // Get a specific dataset
  async getDataset(uploadId: string): Promise<DatasetUpload> {
    const response = await client.get<DatasetUpload>(`/datasets/${uploadId}`)
    return response.data
  },

  // List records in a dataset with filtering
  async listRecords(uploadId: string, params?: DatasetListParams): Promise<DatasetListResult> {
    console.log('listRecords called with uploadId:', uploadId, 'params:', params)
    const url = `/datasets/${uploadId}/records`
    console.log('Making request to:', url)
    const response = await client.get<DatasetListResult>(url, {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        county: params?.county,
        district: params?.district,
        gender: params?.gender,
        registration_status: params?.registration_status,
        national_id: params?.national_id,
        name: params?.name,
        sort_by: params?.sort_by || 'row_number',
        sort_order: params?.sort_order || 'ASC',
      },
    })
    return response.data
  },

  // Get a single record
  async getRecord(uploadId: string, recordId: string): Promise<DatasetRecord> {
    const response = await client.get<DatasetRecord>(`/datasets/${uploadId}/records/${recordId}`)
    return response.data
  },

  // Update a record
  async updateRecord(uploadId: string, recordId: string, updates: Partial<DatasetRecord>): Promise<DatasetRecord> {
    const response = await client.put<DatasetRecord>(`/datasets/${uploadId}/records/${recordId}`, updates)
    return response.data
  },

  // Delete a record
  async deleteRecord(uploadId: string, recordId: string): Promise<void> {
    await client.delete(`/datasets/${uploadId}/records/${recordId}`)
  },

  // Export records to Excel
  async exportToExcel(uploadId: string, params?: DatasetListParams): Promise<Blob> {
    const response = await client.get(`/datasets/${uploadId}/export`, {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 999999,
        county: params?.county,
        district: params?.district,
        gender: params?.gender,
        registration_status: params?.registration_status,
        national_id: params?.national_id,
        name: params?.name,
        sort_by: params?.sort_by || 'row_number',
        sort_order: params?.sort_order || 'ASC',
      },
      responseType: 'blob',
    })
    return response.data
  },

  // Get validation errors
  async getValidationErrors(uploadId: string, page = 1, pageSize = 20): Promise<{ data: DatasetValidationError[]; total: number; page: number; page_size: number; total_page: number }> {
    const response = await client.get<{ data: DatasetValidationError[]; total: number; page: number; page_size: number; total_page: number }>(
      `/datasets/${uploadId}/validation-errors`,
      {
        params: { page, page_size: pageSize },
      }
    )
    return response.data
  },

  // List records across all datasets filtered by county_id
  async listRecordsByCountyId(countyId: string, params?: DatasetListParams): Promise<DatasetListResult> {
    console.log('listRecordsByCountyId called with countyId:', countyId, 'params:', params)
    const response = await client.get<DatasetListResult>('/datasets/records', {
      params: {
        county_id: countyId,
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        district: params?.district,
        gender: params?.gender,
        registration_status: params?.registration_status,
        national_id: params?.national_id,
        name: params?.name,
        sort_by: params?.sort_by || 'row_number',
        sort_order: params?.sort_order || 'ASC',
      },
    })
    return response.data
  },

  // Helper to download exported file
  downloadExcel(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'dataset.xlsx'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },
}
