/**
 * Error Handler Middleware - Centralized error handling and routing
 */

import { API_ERRORS } from '../utils/constants.js';
import { getNotificationManager } from '../components/notifications.js';

class ErrorHandler {
    constructor() {
        this.errorHandlers = {
            [API_ERRORS.UNAUTHORIZED]: this.handleUnauthorized.bind(this),
            [API_ERRORS.FORBIDDEN]: this.handleForbidden.bind(this),
            [API_ERRORS.NOT_FOUND]: this.handleNotFound.bind(this),
            [API_ERRORS.VALIDATION_ERROR]: this.handleValidationError.bind(this),
            [API_ERRORS.SERVER_ERROR]: this.handleServerError.bind(this),
            [API_ERRORS.NETWORK_ERROR]: this.handleNetworkError.bind(this),
            [API_ERRORS.SESSION_EXPIRED]: this.handleSessionExpired.bind(this)
        };
    }

    /**
     * Extract error code and message from API response or error object
     */
    parseError(error) {
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            const code = data?.error?.code || `HTTP_${status}`;
            const message = data?.error?.message || error.message;
            const fields = data?.error?.fields || [];

            return {
                code,
                message,
                status,
                fields,
                isNetwork: false
            };
        }

        if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
            return {
                code: API_ERRORS.NETWORK_ERROR,
                message: 'Unable to connect to the server',
                status: 0,
                fields: [],
                isNetwork: true
            };
        }

        return {
            code: API_ERRORS.SERVER_ERROR,
            message: error.message || 'An unexpected error occurred',
            status: 0,
            fields: [],
            isNetwork: false
        };
    }

    /**
     * Handle error (shows notification and route if needed)
     */
    async handle(error, options = {}) {
        const { showNotification = true, redirect = true } = options;
        const parsed = this.parseError(error);

        console.error('[ErrorHandler]', parsed.code, parsed.message, error);

        if (showNotification) {
            this.showNotification(parsed);
        }

        if (redirect && this.shouldRedirect(parsed.code)) {
            this.redirect(parsed.code, parsed.message);
        }

        return parsed;
    }

    /**
     * Show notification for error
     */
    showNotification(parsed) {
        const notifications = getNotificationManager();

        switch (parsed.code) {
            case API_ERRORS.VALIDATION_ERROR:
                if (parsed.fields && parsed.fields.length > 0) {
                    const fieldMessages = parsed.fields.map(f => f.message).join(', ');
                    notifications.error(`Validation failed: ${fieldMessages}`, 7000);
                } else {
                    notifications.error(parsed.message, 7000);
                }
                break;

            case API_ERRORS.UNAUTHORIZED:
            case API_ERRORS.SESSION_EXPIRED:
                notifications.error('Your session has expired. Please log in again.', 5000);
                break;

            case API_ERRORS.FORBIDDEN:
                notifications.error('You do not have permission to perform this action.', 5000);
                break;

            case API_ERRORS.NOT_FOUND:
                notifications.warning('The requested resource was not found.', 5000);
                break;

            case API_ERRORS.NETWORK_ERROR:
                notifications.error('Network connection failed. Please check your internet connection.', 7000);
                break;

            case API_ERRORS.SERVER_ERROR:
            default:
                notifications.error(parsed.message || 'An error occurred. Please try again.', 7000);
                break;
        }
    }

    /**
     * Determine if error should trigger a redirect
     */
    shouldRedirect(code) {
        return [
            API_ERRORS.UNAUTHORIZED,
            API_ERRORS.SESSION_EXPIRED,
            API_ERRORS.FORBIDDEN,
            API_ERRORS.NOT_FOUND
        ].includes(code);
    }

    /**
     * Redirect to appropriate error page
     */
    redirect(code, message) {
        const errorMap = {
            [API_ERRORS.UNAUTHORIZED]: { type: '401', message: 'You are not authorized to access this resource.' },
            [API_ERRORS.SESSION_EXPIRED]: { type: '401', message: 'Your session has expired.' },
            [API_ERRORS.FORBIDDEN]: { type: '403', message: 'You do not have permission to access this resource.' },
            [API_ERRORS.NOT_FOUND]: { type: '404', message: 'The requested resource was not found.' }
        };

        const errorInfo = errorMap[code] || { type: '500', message };

        // Check if we're already on error page to avoid redirect loop
        if (window.location.pathname === '/error.html') {
            return;
        }

        // Build error page URL
        const params = new URLSearchParams({
            type: errorInfo.type,
            message: message || errorInfo.message
        });

        window.location.href = `/error.html?${params.toString()}`;
    }

    /**
     * Handle specific error types
     */
    handleUnauthorized(error) {
        // Clear auth and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }

    handleForbidden(error) {
        this.redirect(API_ERRORS.FORBIDDEN, 'You do not have permission to perform this action.');
    }

    handleNotFound(error) {
        this.redirect(API_ERRORS.NOT_FOUND, 'The requested resource was not found.');
    }

    handleValidationError(error) {
        const parsed = this.parseError(error);
        const notifications = getNotificationManager();

        if (parsed.fields && parsed.fields.length > 0) {
            notifications.error(`Validation errors: ${parsed.fields.map(f => f.message).join(', ')}`);
            return parsed.fields;
        }

        notifications.error(parsed.message || 'Validation failed');
        return [];
    }

    handleServerError(error) {
        const notifications = getNotificationManager();
        const parsed = this.parseError(error);
        notifications.error(parsed.message || 'An error occurred on the server. Please try again.');
    }

    handleNetworkError(error) {
        const notifications = getNotificationManager();
        notifications.error('Network connection failed. Please check your internet connection.');
    }

    handleSessionExpired(error) {
        const notifications = getNotificationManager();
        notifications.error('Your session has expired. You will be redirected to login.');
        setTimeout(() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        }, 2000);
    }

    /**
     * Setup global error listeners
     */
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[GlobalErrorHandler] Unhandled rejection:', event.reason);
            // Prevent default browser error handling
            event.preventDefault();
            
            this.handle(event.reason || new Error('Unhandled promise rejection'), {
                showNotification: true,
                redirect: false
            });
        });

        // Handle window errors
        window.addEventListener('error', (event) => {
            console.error('[GlobalErrorHandler] Error:', event.error);
            // Don't show notification for script errors, just log them
        });
    }
}

// Global instance
let errorHandler = null;

/**
 * Get or create error handler instance
 */
function getErrorHandler() {
    if (!errorHandler) {
        errorHandler = new ErrorHandler();
        errorHandler.setupGlobalHandlers();
    }
    return errorHandler;
}

export { ErrorHandler, getErrorHandler };
