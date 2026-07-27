/**
 * Data Parsing and Formatting Utilities
 */

export function formatNumber(num) {
    if (typeof num !== 'number') return num;
    return num.toLocaleString('en-US');
}

export function formatCurrency(num) {
    if (typeof num !== 'number') return num;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(num);
}

export function formatPercentage(num, decimals = 1) {
    if (typeof num !== 'number') return num;
    return num.toFixed(decimals) + '%';
}

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

export function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
}

export function formatTime(timeStr) {
    if (!timeStr) return '-';
    try {
        const date = new Date(`2000-01-01T${timeStr}`);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return timeStr;
    }
}

/**
 * Parse Excel-like date (serial number) to JavaScript Date
 * Excel stores dates as serial numbers starting from 1900-01-01
 */
export function parseExcelDate(excelDateNum) {
    if (typeof excelDateNum !== 'number') return new Date(excelDateNum);
    
    // Excel epoch is 1900-01-01, but there's a bug where 1900 is treated as leap year
    const excelEpoch = new Date(1900, 0, 1).getTime();
    const msPerDay = 86400000;
    
    // Adjust for Excel's leap year bug
    const adjustment = excelDateNum > 59 ? 1 : 0;
    
    return new Date(excelEpoch + (excelDateNum - 1 + adjustment) * msPerDay);
}

/**
 * Parse citizen data from imported file
 */
export function parseCitizenData(row) {
    return {
        national_id: row.national_id || row['National ID'] || row['NID'] || '',
        name: row.name || row['Name'] || row['Full Name'] || '',
        email: row.email || row['Email'] || '',
        phone: row.phone || row['Phone'] || row['Phone Number'] || '',
        gender: row.gender || row['Gender'] || '',
        county_id: row.county_id || row['County'] || '',
        district_id: row.district_id || row['District'] || '',
        division_id: row.division_id || row['Division'] || '',
        location_id: row.location_id || row['Location'] || '',
        sub_location_id: row.sub_location_id || row['Sub Location'] || '',
        village_id: row.village_id || row['Village'] || '',
        polling_station: row.polling_station || row['Polling Station'] || '',
        registration_status: row.registration_status || row['Status'] || 'Unregistered'
    };
}

/**
 * Calculate working days between two dates
 */
export function calculateWorkingDays(startDate, endDate, holidays = []) {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    const holidaySet = new Set(holidays.map(h => new Date(h).toDateString()));
    
    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toDateString();
        
        // Count if it's a weekday (1-5 = Mon-Fri) and not a holiday
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidaySet.has(dateStr)) {
            count++;
        }
        
        current.setDate(current.getDate() + 1);
    }
    
    return count;
}

/**
 * Calculate daily target
 */
export function calculateDailyTarget(remainingIds, remainingWorkingDays) {
    if (remainingWorkingDays <= 0) return remainingIds;
    return Math.ceil(remainingIds / remainingWorkingDays);
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(registered, total) {
    if (total <= 0) return 0;
    return Math.round((registered / total) * 100);
}

/**
 * Get performance status based on progress
 */
export function getPerformanceStatus(progress) {
    if (progress >= 80) {
        return { class: 'exceeding', text: 'Exceeding', color: '#16a34a' };
    } else if (progress >= 50) {
        return { class: 'on-track', text: 'On Track', color: '#2563eb' };
    } else if (progress >= 25) {
        return { class: 'below-target', text: 'Below Target', color: '#ea580c' };
    } else {
        return { class: 'critical', text: 'Critical', color: '#dc2626' };
    }
}

/**
 * Validate National ID format (Kenya)
 */
export function validateNationalID(nid) {
    // Kenya NID is typically 8 digits
    return /^\d{8}$/.test(nid) || nid.length > 0;
}

/**
 * Validate email format
 */
export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone) {
    // Accept various formats: +254XXXXXXXXX, 0XXXXXXXXX, 254XXXXXXXXX
    return /^(\+?\d{1,3}|0)[\d\s\-]{8,}$/.test(phone);
}

/**
 * Parse CSV data
 */
export function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });
        
        data.push(row);
    }
    
    return data;
}

/**
 * Convert array to CSV
 */
export function convertToCSV(data, headers = null) {
    if (!data || data.length === 0) return '';
    
    // Use provided headers or extract from first row
    const cols = headers || Object.keys(data[0]);
    
    let csv = cols.join(',') + '\n';
    
    data.forEach(row => {
        const values = cols.map(col => {
            const value = row[col] || '';
            // Escape values containing commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });
    
    return csv;
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data, filename, headers = null) {
    const csv = convertToCSV(data, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects
 */
export function merge(target, source) {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = merge(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
