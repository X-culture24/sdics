/**
 * Login Page Logic
 * Handles authentication and redirects to dashboard
 */

import { authService } from '../api/auth.js';
import { getErrorMessage } from '../api/client.js';

export async function initLoginPage() {
    const form = document.getElementById('loginForm');
    const errorAlert = document.getElementById('errorAlert');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnSpinner = document.getElementById('loginBtnSpinner');

    if (!form) return;

    // If already logged in, redirect to dashboard
    if (authService.isAuthenticated()) {
        window.location.href = '/dashboard.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorAlert.style.display = 'none';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validation
        if (!email || !password) {
            errorAlert.textContent = 'Please enter both email and password';
            errorAlert.style.display = 'block';
            return;
        }

        // Show loading state
        loginBtnText.style.display = 'none';
        loginBtnSpinner.style.display = 'inline-block';
        form.querySelector('button').disabled = true;

        try {
            await authService.login(email, password);
            // Redirect to dashboard
            window.location.href = '/dashboard.html';
        } catch (error) {
            errorAlert.textContent = getErrorMessage(error);
            errorAlert.style.display = 'block';
        } finally {
            loginBtnText.style.display = 'inline';
            loginBtnSpinner.style.display = 'none';
            form.querySelector('button').disabled = false;
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}
