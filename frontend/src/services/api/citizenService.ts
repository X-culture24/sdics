import apiClient from '@/api/axios';
import type { Citizen, RegistrationRecord, ListResponse } from '@/types/api';

export interface CitizenListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  districtId?: string;
}

// Helper to convert snake_case citizen response to camelCase
const convertCitizen = (data: any): Citizen => ({
  id: data.id,
  nationalId: data.national_id ?? data.nationalId,
  fullName: data.full_name ?? data.fullName,
  gender: data.gender,
  phoneNumber: data.phone_number ?? data.phoneNumber,
  countyId: data.county_id ?? data.countyId,
  districtId: data.district_id ?? data.districtId,
  divisionId: data.division_id ?? data.divisionId,
  locationId: data.location_id ?? data.locationId,
  subLocationId: data.sub_location_id ?? data.subLocationId,
  villageId: data.village_id ?? data.villageId,
  pollingStation: data.polling_station ?? data.pollingStation,
  registrationStatus: data.registration_status ?? data.registrationStatus,
  registrationDate: data.registration_date ?? data.registrationDate,
  updatedBy: data.updated_by ?? data.updatedBy,
  createdAt: data.created_at ?? data.createdAt,
  updatedAt: data.updated_at ?? data.updatedAt,
  county: data.county,
  district: data.district,
});

export const citizenService = {
  list: async (params: CitizenListParams = {}): Promise<ListResponse<Citizen>> => {
    // Convert camelCase params to snake_case for backend
    const backendParams: any = {}
    if (params.page) backendParams.page = params.page
    if (params.pageSize) backendParams.page_size = params.pageSize
    if (params.search) backendParams.q = params.search
    if (params.status) backendParams.registration_status = params.status
    if (params.districtId) backendParams.district_id = params.districtId
    
    const { data } = await apiClient.get<any>('/citizens', { params: backendParams });
    const citizenList = data?.data || [];
    const convertedCitizens = Array.isArray(citizenList) ? citizenList.map(convertCitizen) : [];
    
    return {
      data: convertedCitizens,
      total: data?.total || 0,
      page: data?.page || 1,
      pageSize: data?.page_size || params.pageSize || 20,
    };
  },

  getById: async (id: string): Promise<Citizen> => {
    const { data } = await apiClient.get<any>(`/citizens/${id}`);
    return convertCitizen(data);
  },

  getByNationalId: async (nationalId: string): Promise<Citizen> => {
    const { data } = await apiClient.get<any>(`/citizens/nid/${nationalId}`);
    return convertCitizen(data);
  },

  register: async (id: string, campaignId?: string): Promise<RegistrationRecord> => {
    const { data } = await apiClient.post<any>(`/citizens/${id}/register`, {
      campaign_id: campaignId,
    });
    return data;
  },

  create: async (citizen: Partial<Citizen>): Promise<Citizen> => {
    const { data } = await apiClient.post<any>('/citizens', citizen);
    return convertCitizen(data);
  },

  update: async (id: string, citizen: Partial<Citizen>): Promise<Citizen> => {
    const { data } = await apiClient.put<any>(`/citizens/${id}`, citizen);
    return convertCitizen(data);
  },
};
