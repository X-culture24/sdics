/**
 * Imports API Service
 * File upload and import job management
 */

import client, { getErrorMessage } from './client.js';

export const importsService = {
    /**
     * List import jobs with pagination
     */
    async list(page = 1, pageSize = 50) {
        try {
            const response = await client.get('/imports', {
                params: { page, page_size: pageSize }
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get import job details
     */
    async getById(id) {
        try {
            const response = await client.get(`/imports/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Upload file for import
     */
    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await client.post('/imports/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    // Dispatch progress event
                    window.dispatchEvent(
                        new CustomEvent('upload-progress', {
                            detail: { percentCompleted }
                        })
                    );
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Start import from datasets
     */
    async importFromDataset(datasetName) {
        try {
            const response = await client.post('/imports/from-datasets', {
                dataset_name: datasetName
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get list of available datasets
     */
    async getDatasets() {
        try {
            const response = await client.get('/datasets');
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    }
};
