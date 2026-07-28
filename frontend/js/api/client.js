/**
 * API Client - Axios configuration with JWT token management
 * Automatically handles token refresh, authentication, and errors
 */

const API_BASE_URL = window.API_BASE_URL || `${window.location.protocol}//${window.location.host}/api/v1`;

// Create Axios instance
const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000  // 30 second timeout
});

// Track if refresh is in progress to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(callback) {
    refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers when token refresh is complete
 */
function onTokenRefreshed(token) {
    refreshSubscribers.forEach(callback => callback(token));
    refreshSubscribers = [];
}

/**
 * Request interceptor - attach JWT token to all requests
 */
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response interceptor - handle token refresh, errors, and validation
 */
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 (Unauthorized) and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;

                try {
                    const refreshToken = localStorage.getItem('refresh_token');
                    if (!refreshToken) {
                        throw new Error('No refresh token available');
                    }

                    // Attempt token refresh
                    const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refresh_token: refreshToken
                    }, {
                        timeout: 10000
                    });

                    const { access_token, refresh_token } = refreshResponse.data.data;
                    localStorage.setItem('auth_token', access_token);
                    localStorage.setItem('refresh_token', refresh_token);

                    // Update default auth header
                    client.defaults.headers.common.Authorization = `Bearer ${access_token}`;

                    // Notify subscribers
                    onTokenRefreshed(access_token);
                    isRefreshing = false;

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    return client(originalRequest);

                } catch (refreshError) {
                    // Refresh failed - clear auth and redirect to login
                    isRefreshing = false;
                    refreshSubscribers = [];
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                    return Promise.reject(refreshError);
                }
            } else {
                // Token refresh is already in progress, wait for it
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(client(originalRequest));
                    });
                });
            }
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            const errorCode = error.response.data?.error?.code;
            if (errorCode === 'SESSION_EXPIRED') {
                // Session timeout, redirect to login
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            }
        }

        // Return error with structured format
        return Promise.reject(error);
    }
);

/**
 * Extract error message from API response
 */
export function getErrorMessage(error) {
    if (error.response?.data?.error?.message) {
        return error.response.data.error.message;
    }
    if (error.response?.data?.message) {
        return error.response.data.message;
    }
    if (error.message === 'Network Error') {
        return 'Network connection failed. Please check your internet connection.';
    }
    if (error.code === 'ECONNABORTED') {
        return 'Request timeout. Please try again.';
    }
    if (error.message) {
        return error.message;
    }
    return 'An error occurred. Please try again.';
}

/**
 * Extract field-level validation errors from API response
 */
export function getValidationErrors(error) {
    const errors = {};
    if (error.response?.data?.error?.fields && Array.isArray(error.response.data.error.fields)) {
        error.response.data.error.fields.forEach(field => {
            errors[field.field] = field.message;
        });
    }
    return errors;
}

/**
 * Get error code from API response
 */
export function getErrorCode(error) {
    return error.response?.data?.error?.code || 'UNKNOWN_ERROR';
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error) {
    return error.response?.status === 422 || error.response?.data?.error?.code === 'VALIDATION_ERROR';
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error) {
    return error.response?.status === 401 || error.response?.data?.error?.code === 'UNAUTHORIZED';
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error) {
    return error.response?.status === 403 || error.response?.data?.error?.code === 'FORBIDDEN';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error) {
    return !error.response || error.message === 'Network Error' || error.code === 'ECONNABORTED';
}

// Export client as default
export default client;
