/**
 * Campaigns API Service
 * Campaign management and operations
 */

import client, { getErrorMessage } from './client.js';

export const campaignsService = {
    /**
     * List campaigns with pagination
     */
    async list(page = 1, pageSize = 50) {
        try {
            const response = await client.get('/campaigns', {
                params: { page, page_size: pageSize }
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get campaign by ID
     */
    async getById(id) {
        try {
            const response = await client.get(`/campaigns/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Create new campaign
     */
    async create(data) {
        try {
            const response = await client.post('/campaigns', data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Update campaign
     */
    async update(id, data) {
        try {
            const response = await client.put(`/campaigns/${id}`, data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Change campaign status
     */
    async changeStatus(id, status) {
        try {
            const response = await client.patch(`/campaigns/${id}/status`, { status });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Delete campaign
     */
    async delete(id) {
        try {
            const response = await client.delete(`/campaigns/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get campaign statistics
     */
    async getStats(id) {
        try {
            const response = await client.get(`/campaigns/${id}/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching campaign stats:', error);
            return {};
        }
    }
};
