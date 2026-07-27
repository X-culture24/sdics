/**
 * API Client - Axios configuration with JWT token management
 * Automatically handles token refresh and authentication
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api/v1';

// Create Axios instance
const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - attach JWT token
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

// Response interceptor - handle token refresh and errors
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Attempt token refresh
                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refresh_token: refreshToken
                });

                const { data } = response.data;
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                return client(originalRequest);
            } catch (refreshError) {
                // Refresh failed - redirect to login
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
                return Promise.reject(refreshError);
            }
        }

// Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.error('Access denied:', error.response.data);
        }

        return Promise.reject(error);
    }
);

/**
 * Error handler - extract error message from response
 */
function getErrorMessage(error) {
    if (error.response?.data?.error?.message) {
        return error.response.data.error.message;
    }
    if (error.response?.data?.message) {
        return error.response.data.message;
    }
    if (error.message) {
        return error.message;
    }
    return 'An error occurred. Please try again.';
}

/**
 * Get validation errors from API response
 */
function getValidationErrors(error) {
    const errors = {};
    if (error.response?.data?.error?.fields) {
        error.response.data.error.fields.forEach(field => {
            errors[field.field] = field.message;
        });
    }
    return errors;
}
