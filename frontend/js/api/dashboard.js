/**
 * Dashboard API Service
 * Fetches KPIs, charts, and performance data
 */

import client, { getErrorMessage } from './client.js';

export const dashboardService = {
    /**
     * Get KPI metrics for dashboard
     */
    async getKPIs(campaignId = null) {
        try {
            const params = {};
            if (campaignId) params.campaign_id = campaignId;

            const response = await client.get('/dashboard/kpis', { params });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get district performance data for charts
     */
    async getDistrictPerformance(campaignId = null) {
        try {
            const params = {};
            if (campaignId) params.campaign_id = campaignId;

            const response = await client.get('/dashboard/district-performance', { params });
            return response.data?.data || [];
        } catch (error) {
            console.error('Error fetching district performance:', error);
            return [];
        }
    },

    /**
     * Get registration trend data
     */
    async getRegistrationTrend(days = 30, campaignId = null) {
        try {
            const params = { days: Math.max(7, Math.min(days, 365)) };
            if (campaignId) params.campaign_id = campaignId;

            const response = await client.get('/dashboard/registration-trend', { params });
            return response.data?.data || [];
        } catch (error) {
            console.error('Error fetching registration trend:', error);
            return [];
        }
    },

    /**
     * Get performance table data
     */
    async getPerformanceTable(level = 3, campaignId = null) {
        try {
            const params = { level: Math.max(2, Math.min(level, 8)) };
            if (campaignId) params.campaign_id = campaignId;

            const response = await client.get('/dashboard/performance-table', { params });
            return response.data?.data || [];
        } catch (error) {
            console.error('Error fetching performance table:', error);
            return [];
        }
    }
};
