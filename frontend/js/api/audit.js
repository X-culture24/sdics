/**
 * Audit Logs API Service
 * Audit trail and logging
 */

import client, { getErrorMessage } from './client.js';

export const auditService = {
    /**
     * List audit logs with pagination and filtering
     */
    async list(page = 1, pageSize = 50, filters = {}) {
        try {
            const params = {
                page,
                page_size: pageSize,
                ...filters
            };

            const response = await client.get('/audit-logs', { params });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get audit log entry by ID
     */
    async getById(id) {
        try {
            const response = await client.get(`/audit-logs/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Log an event
     */
    async logEvent(data) {
        try {
            const response = await client.post('/audit-logs', data);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    }
};
