// Frontend Configuration
// Adjust these values based on your environment

export const CONFIG = {
    // API Base URL - adjust if backend is on different server
    API_BASE: process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:8000',
    
    // Token storage keys
    TOKEN_KEY: 'auth_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    USER_KEY: 'user',
    
    // API timeouts (in milliseconds)
    REQUEST_TIMEOUT: 30000,
    
    // Pagination defaults
    PAGE_SIZE: 10,
    
    // Session settings
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
};

// Update API_BASE in api.js when using this config
// Example: const response = await fetch(`${CONFIG.API_BASE}/api/v1/...`)
