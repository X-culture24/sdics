/**
 * Citizens API Service
 * CRUD operations for citizen records
 */

import client, { getErrorMessage, getValidationErrors } from './client.js';

export const citizensService = {
    /**
     * List citizens with pagination
     */
    async list(page = 1, pageSize = 50, filters = {}) {
        try {
            const params = {
                page,
                page_size: pageSize,
                ...filters
            };

            const response = await client.get('/citizens', { params });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get citizen by ID
     */
    async getById(id) {
        try {
            const response = await client.get(`/citizens/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get citizen by National ID
     */
    async getByNationalID(nid) {
        try {
            const response = await client.get(`/citizens/nid/${nid}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Create new citizen
     */
    async create(data) {
        try {
            const response = await client.post('/citizens', data);
            return response.data;
        } catch (error) {
            const validationErrors = getValidationErrors(error);
            if (Object.keys(validationErrors).length > 0) {
                throw { validationErrors };
            }
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Update citizen
     */
    async update(id, data) {
        try {
            const response = await client.put(`/citizens/${id}`, data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Delete citizen
     */
    async delete(id) {
        try {
            const response = await client.delete(`/citizens/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Register citizen as voter
     */
    async register(id, campaignId) {
        try {
            const response = await client.post(`/citizens/${id}/register`, {
                campaign_id: campaignId
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get citizen statistics
     */
    async getStats() {
        try {
            const response = await client.get('/citizens/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching citizen stats:', error);
            return { total: 0, registered: 0, unregistered: 0 };
        }
    }
};
