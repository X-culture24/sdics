/**
 * Authentication Service - Manage auth state, sessions, and user data
 */

import client from '../api/client.js';

class AuthService {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.listeners = [];
        this.sessionWarningTimeout = null;
        this.sessionTimeoutTimeout = null;
        
        // Load persisted auth state
        this.loadFromStorage();
    }

    /**
     * Load authentication state from local storage
     */
    loadFromStorage() {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            this.isAuthenticated = true;
            try {
                this.user = JSON.parse(storedUser);
            } catch (e) {
                console.error('Failed to parse stored user:', e);
                this.isAuthenticated = false;
                this.user = null;
            }
        }
    }

    /**
     * Login with email and password
     */
    async login(email, password) {
        try {
            const response = await client.post('/auth/login', {
                email,
                password
            });

            const { access_token, refresh_token, user } = response.data.data;

            // Store tokens and user
            localStorage.setItem('auth_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            localStorage.setItem('user', JSON.stringify(user));

            this.isAuthenticated = true;
            this.user = user;

            // Setup session timeout tracking
            this.setupSessionTracking();

            // Notify listeners
            this.notifyListeners('login', user);

            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error?.message || 'Login failed'
            };
        }
    }

    /**
     * Logout and clear session
     */
    async logout() {
        try {
            // Attempt to notify backend of logout
            await client.post('/auth/logout');
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }

        // Clear local state
        this.clearSession();
    }

    /**
     * Clear session data
     */
    clearSession() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        this.isAuthenticated = false;
        this.user = null;

        // Clear session timeouts
        if (this.sessionWarningTimeout) {
            clearTimeout(this.sessionWarningTimeout);
        }
        if (this.sessionTimeoutTimeout) {
            clearTimeout(this.sessionTimeoutTimeout);
        }

        // Notify listeners
        this.notifyListeners('logout');
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        try {
            const response = await client.get('/me');
            this.user = response.data.data;
            localStorage.setItem('user', JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            this.clearSession();
            throw error;
        }
    }

    /**
     * Change password
     */
    async changePassword(oldPassword, newPassword) {
        try {
            const response = await client.put('/me/password', {
                old_password: oldPassword,
                new_password: newPassword
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error?.message || 'Password change failed'
            };
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        try {
            const response = await client.post('/auth/forgot-password', {
                email
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error?.message || 'Password reset request failed'
            };
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await client.post('/auth/reset-password', {
                token,
                password: newPassword
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error?.message || 'Password reset failed'
            };
        }
    }

    /**
     * Check if user has a specific role
     */
    hasRole(roleName) {
        if (!this.user || !this.user.role) {
            return false;
        }
        return this.user.role.name === roleName;
    }

    /**
     * Check if user has a specific permission
     */
    hasPermission(permissionName) {
        if (!this.user || !this.user.role || !this.user.role.permissions) {
            return false;
        }
        return this.user.role.permissions.some(p => p.name === permissionName);
    }

    /**
     * Check if user is a system administrator
     */
    isSystemAdmin() {
        return this.hasRole('System Administrator');
    }

    /**
     * Check if user is a read-only viewer
     */
    isReadOnly() {
        return this.hasRole('Read Only Viewer');
    }

    /**
     * Get user's assigned admin unit ID
     */
    getAdminUnitID() {
        return this.user?.admin_unit?.id || null;
    }

    /**
     * Get user's assigned admin unit name
     */
    getAdminUnitName() {
        return this.user?.admin_unit?.name || 'Unknown';
    }

    /**
     * Setup session timeout tracking (reset on user activity)
     */
    setupSessionTracking() {
        const SESSION_WARNING_TIME = 600000; // 10 minutes
        const SESSION_TIMEOUT_TIME = 1800000; // 30 minutes

        const resetSessionTimeout = () => {
            // Clear existing timeouts
            if (this.sessionWarningTimeout) clearTimeout(this.sessionWarningTimeout);
            if (this.sessionTimeoutTimeout) clearTimeout(this.sessionTimeoutTimeout);

            // Set warning timeout (10 minutes)
            this.sessionWarningTimeout = setTimeout(() => {
                this.notifyListeners('session-warning');
            }, SESSION_WARNING_TIME);

            // Set logout timeout (30 minutes)
            this.sessionTimeoutTimeout = setTimeout(() => {
                this.clearSession();
                this.notifyListeners('session-expired');
                window.location.href = '/login.html';
            }, SESSION_TIMEOUT_TIME);
        };

        // Reset timeout on user activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetSessionTimeout, true);
        });

        // Initial timeout setup
        resetSessionTimeout();
    }

    /**
     * Subscribe to auth state changes
     */
    onChange(callback) {
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify listeners of auth state changes
     */
    notifyListeners(eventType, data = null) {
        this.listeners.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (error) {
                console.error('Auth listener error:', error);
            }
        });
    }

    /**
     * Get auth header value
     */
    getAuthHeader() {
        const token = localStorage.getItem('auth_token');
        return token ? `Bearer ${token}` : null;
    }

    /**
     * Check if token is expired
     */
    isTokenExpired() {
        const token = localStorage.getItem('auth_token');
        if (!token) return true;

        try {
            // Decode JWT payload (without verification)
            const parts = token.split('.');
            if (parts.length !== 3) return true;

            const payload = JSON.parse(atob(parts[1]));
            const expiryTime = payload.exp * 1000; // Convert to milliseconds
            
            return Date.now() > expiryTime;
        } catch (error) {
            console.error('Failed to check token expiry:', error);
            return true;
        }
    }

    /**
     * Refresh tokens if needed
     */
    async ensureTokenValid() {
        if (!this.isTokenExpired()) {
            return true;
        }

        // Let the API client handle the refresh via interceptor
        // by making a simple authenticated request
        try {
            await client.get('/ping');
            return true;
        } catch (error) {
            this.clearSession();
            return false;
        }
    }
}

// Global instance
let authService = null;

/**
 * Get or create auth service instance
 */
function getAuthService() {
    if (!authService) {
        authService = new AuthService();
    }
    return authService;
}

export { AuthService, getAuthService };
