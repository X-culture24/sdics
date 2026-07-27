import { apiCall } from './api.js';

export class AuthService {
    async login(email, password) {
        try {
            const response = await apiCall('/api/v1/auth/login', 'POST', {
                email,
                password
            }, false);
            
            if (response.data) {
                localStorage.setItem('auth_token', response.data.access_token);
                localStorage.setItem('refresh_token', response.data.refresh_token);
                localStorage.setItem('user', JSON.stringify({
                    id: response.data.user.id,
                    email: response.data.user.email,
                    name: response.data.user.name,
                    role: response.data.user.role_name
                }));
                
                return response.data;
            }
        } catch (error) {
            throw error;
        }
    }

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }

    isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    }

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }

    async refresh() {
        try {
            const response = await apiCall('/api/v1/auth/refresh', 'POST', {
                refresh_token: localStorage.getItem('refresh_token')
            }, false);
            
            if (response.data) {
                localStorage.setItem('auth_token', response.data.access_token);
                return response.data.access_token;
            }
        } catch (error) {
            this.logout();
            throw error;
        }
    }

    async changePassword(currentPassword, newPassword) {
        return apiCall('/api/v1/me/password', 'PUT', {
            current_password: currentPassword,
            new_password: newPassword
        });
    }

    async getMe() {
        return apiCall('/api/v1/me');
    }
}
