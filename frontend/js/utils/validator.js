/**
 * Validation Utilities
 * Input validation and error handling
 */

/**
 * Validate email format
 */
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Validate National ID format (Kenya - typically 8 digits)
 */
export function validateNationalID(nid) {
    return /^\d{8}$/.test(nid) || nid.length > 0;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone) {
    // Accept various formats: +254XXXXXXXXX, 0XXXXXXXXX, 254XXXXXXXXX
    return /^(\+?\d{1,3}|0)[\d\s\-]{8,}$/.test(phone);
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
    const errors = [];
    
    if (password.length < 12) {
        errors.push('Password must be at least 12 characters');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain lowercase letters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain uppercase letters');
    }
    if (!/\d/.test(password)) {
        errors.push('Password must contain numbers');
    }
    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('Password must contain special characters (!@#$%^&*)');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate form data
 */
export function validateForm(data, rules) {
    const errors = {};
    
    Object.keys(rules).forEach(field => {
        const rule = rules[field];
        const value = data[field];
        
        // Required
        if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
            errors[field] = `${field} is required`;
            return;
        }
        
        // Email
        if (rule.email && value && !validateEmail(value)) {
            errors[field] = 'Invalid email format';
            return;
        }
        
        // Min length
        if (rule.minLength && value && value.length < rule.minLength) {
            errors[field] = `${field} must be at least ${rule.minLength} characters`;
            return;
        }
        
        // Max length
        if (rule.maxLength && value && value.length > rule.maxLength) {
            errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
            return;
        }
        
        // Pattern
        if (rule.pattern && value && !rule.pattern.test(value)) {
            errors[field] = rule.patternMessage || 'Invalid format';
            return;
        }
        
        // Custom validator
        if (rule.custom && value) {
            const customError = rule.custom(value);
            if (customError) {
                errors[field] = customError;
            }
        }
    });
    
    return errors;
}

/**
 * Display form validation errors in UI
 */
export function displayFormErrors(form, errors) {
    // Clear previous errors
    form.querySelectorAll('.invalid-feedback').forEach(el => {
        el.style.display = 'none';
    });
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    
    // Display new errors
    Object.keys(errors).forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input) {
            input.classList.add('is-invalid');
            const feedback = input.parentElement.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = errors[field];
                feedback.style.display = 'block';
            }
        }
    });
}

/**
 * Clear form validation errors
 */
export function clearFormErrors(form) {
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(el => {
        el.style.display = 'none';
    });
}
