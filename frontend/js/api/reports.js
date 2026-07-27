/**
 * Reports API Service
 * Report generation and export
 */

import client, { getErrorMessage } from './client.js';

function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
}

export const reportsService = {
    /**
     * Export citizens report
     */
    async exportCitizens(format = 'csv') {
        try {
            const response = await client.get('/reports/citizens', {
                params: { format },
                responseType: 'blob'
            });
            
            const ext = format === 'excel' ? 'xlsx' : 'csv';
            downloadFile(response.data, `citizens_${Date.now()}.${ext}`);
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Export performance report
     */
    async exportPerformance(format = 'pdf') {
        try {
            const response = await client.get('/reports/performance', {
                params: { format },
                responseType: 'blob'
            });
            
            const ext = format === 'pdf' ? 'pdf' : 'csv';
            downloadFile(response.data, `performance_${Date.now()}.${ext}`);
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Export campaign statistics
     */
    async exportCampaignStats(campaignId) {
        try {
            const response = await client.get(`/reports/campaigns/${campaignId}`, {
                responseType: 'blob'
            });
            
            downloadFile(response.data, `campaign_stats_${Date.now()}.pdf`);
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Export audit log
     */
    async exportAuditLog(format = 'csv') {
        try {
            const response = await client.get('/reports/audit-logs', {
                params: { format },
                responseType: 'blob'
            });
            
            const ext = format === 'pdf' ? 'pdf' : 'csv';
            downloadFile(response.data, `audit_log_${Date.now()}.${ext}`);
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get list of campaigns for report selection
     */
    async getCampaigns() {
        try {
            const response = await client.get('/campaigns', {
                params: { page_size: 100 }
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get performance report data
     */
    async getPerformanceReport() {
        try {
            const response = await client.get('/reports/performance');
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get campaign report data
     */
    async getCampaignReport(campaignId) {
        try {
            const response = await client.get(`/reports/campaigns/${campaignId}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    }
};
