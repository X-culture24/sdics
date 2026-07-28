/**
 * DateTime Utilities - Date and time formatting, calculations, and helpers
 */

/**
 * Format date to display format (e.g., "Jan 15, 2024")
 */
export function formatDate(date, format = 'short') {
    if (!date) return '';
    
    const d = new Date(date);
    const options = format === 'short' 
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric' };
    
    return d.toLocaleDateString('en-US', options);
}

/**
 * Format date and time (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export function formatDateTime(date, format = 'short') {
    if (!date) return '';
    
    const d = new Date(date);
    const dateOptions = format === 'short'
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric' };
    
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    
    const datePart = d.toLocaleDateString('en-US', dateOptions);
    const timePart = d.toLocaleTimeString('en-US', timeOptions);
    
    return `${datePart} at ${timePart}`;
}

/**
 * Format time only (e.g., "2:30 PM")
 */
export function formatTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (days < 365) {
        const months = Math.floor(days / 30);
        return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(days / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Calculate working days between two dates (exclude Saturdays and Sundays)
 */
export function calculateWorkingDays(startDate, endDate, excludeDates = []) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const excludeSet = new Set(excludeDates.map(d => new Date(d).toDateString()));
    
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toDateString();
        
        // Include if it's a weekday (Mon-Fri) and not in exclude list
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !excludeSet.has(dateStr)) {
            count++;
        }
        
        current.setDate(current.getDate() + 1);
    }
    
    return count;
}

/**
 * Get remaining working days from today to end date
 */
export function getRemainingWorkingDays(endDate, excludeDates = []) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    // Include today in the count
    return calculateWorkingDays(today, end, excludeDates);
}

/**
 * Get current date formatted
 */
export function getCurrentDate() {
    return formatDate(new Date());
}

/**
 * Get current time formatted
 */
export function getCurrentTime() {
    return formatTime(new Date());
}

/**
 * Get current date and time
 */
export function getCurrentDateTime() {
    return formatDateTime(new Date());
}

/**
 * Check if date is today
 */
export function isToday(date) {
    const d = new Date(date);
    const today = new Date();
    
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
}

/**
 * Check if date is in the past
 */
export function isPast(date) {
    return new Date(date) < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(date) {
    return new Date(date) > new Date();
}

/**
 * Add days to date
 */
export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * Add hours to date
 */
export function addHours(date, hours) {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
}

/**
 * Start of day (00:00:00)
 */
export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * End of day (23:59:59)
 */
export function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Compare two dates (returns -1, 0, or 1)
 */
export function compareDates(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
}

/**
 * Format duration from milliseconds (e.g., "2h 30m")
 */
export function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ') || '0s';
}

/**
 * Get ISO date string (YYYY-MM-DD)
 */
export function getISODate(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
}
