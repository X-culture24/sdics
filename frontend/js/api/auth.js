/**
 * Authentication API Service
 * Handles login, logout, refresh token operations
 */

import client, { getErrorMessage } from './client.js';

export const authService = {
    /**
     * Login with email and password
     */
    async login(email, password) {
        try {
            const response = await client.post('/auth/login', {
                email,
                password
            });
            
            const { data } = response.data;
            
            // Store tokens and user info
            localStorage.setItem('auth_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.full_name,
                role: data.user.role_name,
                admin_unit: data.user.admin_unit_name
            }));
            
            return data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Logout current user
     */
    async logout() {
        try {
            await client.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage regardless of API response
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
        }
    },

    /**
     * Get current authenticated user
     */
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    },

    /**
     * Get authentication token
     */
    getToken() {
        return localStorage.getItem('auth_token');
    },

    /**
     * Change user password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await client.put('/me/password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get current user profile
     */
    async getProfile() {
        try {
            const response = await client.get('/me');
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    }
};
