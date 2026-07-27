/**
 * Users API Service
 * User management and administration
 */

import client, { getErrorMessage } from './client.js';

export const usersService = {
    /**
     * List users with pagination
     */
    async list(page = 1, pageSize = 50) {
        try {
            const response = await client.get('/users', {
                params: { page, page_size: pageSize }
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get user by ID
     */
    async getById(id) {
        try {
            const response = await client.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Create new user
     */
    async create(data) {
        try {
            const response = await client.post('/users', data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Update user
     */
    async update(id, data) {
        try {
            const response = await client.put(`/users/${id}`, data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Set user active/inactive
     */
    async setActive(id, isActive) {
        try {
            const response = await client.patch(`/users/${id}/active`, {
                is_active: isActive
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Reset user password
     */
    async resetPassword(id) {
        try {
            const response = await client.post(`/users/${id}/reset-password`, {});
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    async getRoles() {
        try {
            const response = await client.get('/roles');
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Toggle user active status
     */
    async toggleStatus(id) {
        try {
            const response = await client.patch(`/users/${id}/active`, {});
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    }
};
