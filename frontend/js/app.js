/**
 * Main Application Controller
 * Handles page routing, authentication, and layout
 */

import { authService } from './api/auth.js';
import { initDashboardPage } from './pages/dashboard.js';
import { initCitizensPage } from './pages/citizens.js';
import { initCampaignsPage } from './pages/campaigns.js';
import { initUsersPage } from './pages/users.js';
import { initImportsPage } from './pages/imports.js';
import { initReportsPage } from './pages/reports.js';
import { initAuditPage } from './pages/audit.js';

/**
 * Global App State
 */
const app = {
    currentPage: null,
    user: null,
    isLoading: false,
    charts: {}
};

/**
 * Redirect to login if not authenticated
 */
function requireAuth() {
    if (!authService.isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Navigate to page
 */
async function navigateToPage(pageName) {
    if (app.currentPage === pageName) return;

    // Check authentication for protected pages
    if (['dashboard', 'citizens', 'campaigns', 'users', 'imports', 'reports', 'audit'].includes(pageName)) {
        if (!requireAuth()) return;
    }

    app.currentPage = pageName;

    // Update active nav link
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.nav-link[data-page="${pageName}"]`)?.classList.add('active');

    // Load page
    showLoading();
    try {
        switch (pageName) {
            case 'dashboard':
                await initDashboardPage();
                break;
            case 'citizens':
                await initCitizensPage();
                break;
            case 'campaigns':
                await initCampaignsPage();
                break;
            case 'users':
                await initUsersPage();
                break;
            case 'imports':
                await initImportsPage();
                break;
            case 'reports':
                await initReportsPage();
                break;
            case 'audit':
                await initAuditPage();
                break;
            default:
                await navigateToPage('dashboard');
        }
    } catch (error) {
        console.error('Error loading page:', error);
        showError('Error loading page: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Show loading overlay
 */
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('d-none');
    app.isLoading = true;
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('d-none');
    app.isLoading = false;
}

/**
 * Show error alert
 */
function showError(message) {
    const container = document.getElementById('pageContainer');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger" role="alert" style="margin-bottom: 20px;">
                <i class="bi bi-exclamation-circle"></i> ${message}
            </div>
        `;
    }
}

/**
 * Update current date/time display
 */
function updateDateTime() {
    const dateTimeEl = document.getElementById('currentDateTime');
    if (dateTimeEl) {
        const now = new Date();
        dateTimeEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/**
 * Update user display
 */
function updateUserDisplay() {
    const user = authService.getUser();
    const userEmail = document.getElementById('userEmail');
    if (userEmail && user) {
        userEmail.textContent = user.email;
    }
    app.user = user;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const pageName = link.getAttribute('data-page');
            await navigateToPage(pageName);
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await authService.logout();
            window.location.href = '/login.html';
        });
    }

    // Sidebar toggle on mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking on a link (mobile)
    if (sidebar) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        });
    }
}

/**
 * Initialize application
 */
async function initApp() {
    // Check authentication
    if (!authService.isAuthenticated()) {
        // Redirect to login
        window.location.href = '/login.html';
        return;
    }

    // Update user display
    updateUserDisplay();

    // Update date/time and set interval
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // Setup event listeners
    setupEventListeners();

    // Load dashboard as default page
    await navigateToPage('dashboard');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for use in pages
window.app = app;
