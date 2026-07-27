/**
 * Formatting Utilities
 * Number, date, and currency formatting
 */

/**
 * Format number with thousand separators
 */
export function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-US');
}

/**
 * Format date to readable format
 */
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Format date and time
 */
export function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Format time only
 */
export function formatTime(timeStr) {
    if (!timeStr) return '-';
    try {
        const date = new Date(`2000-01-01T${timeStr}`);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return timeStr;
    }
}

/**
 * Format percentage
 */
export function formatPercentage(num, decimals = 1) {
    if (typeof num !== 'number' || isNaN(num)) return '0%';
    return num.toFixed(decimals) + '%';
}

/**
 * Format currency
 */
export function formatCurrency(num, currency = 'USD') {
    if (typeof num !== 'number' || isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(num);
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate string
 */
export function truncate(str, length = 50) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';

        return formatDate(dateStr);
    } catch {
        return dateStr;
    }
}

/**
 * Format performance status with badge
 */
export function getPerformanceStatus(progress) {
    if (progress >= 80) {
        return { class: 'exceeding', text: 'Exceeding', icon: '✓' };
    } else if (progress >= 50) {
        return { class: 'on-track', text: 'On Track', icon: '→' };
    } else if (progress >= 25) {
        return { class: 'below-target', text: 'Below Target', icon: '↓' };
    } else {
        return { class: 'critical', text: 'Critical', icon: '⚠' };
    }
}
