/**
 * Admin Units API Service
 * Administrative hierarchy management
 */

import client, { getErrorMessage } from './client.js';

export const adminUnitsService = {
    /**
     * List admin units
     */
    async list(page = 1, pageSize = 50) {
        try {
            const response = await client.get('/admin-units', {
                params: { page, page_size: pageSize }
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get admin unit by ID
     */
    async getById(id) {
        try {
            const response = await client.get(`/admin-units/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Create new admin unit
     */
    async create(data) {
        try {
            const response = await client.post('/admin-units', data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Update admin unit
     */
    async update(id, data) {
        try {
            const response = await client.put(`/admin-units/${id}`, data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Delete admin unit
     */
    async delete(id) {
        try {
            const response = await client.delete(`/admin-units/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get descendants of an admin unit
     */
    async getDescendants(id) {
        try {
            const response = await client.get(`/admin-units/${id}/descendants`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    }
};
