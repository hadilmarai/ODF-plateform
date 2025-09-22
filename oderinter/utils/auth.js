/**
 * Authentication Utility (Legacy)
 * This is kept for backward compatibility with existing components
 * New components should use the AuthContext instead
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
    }

    /**
     * Get current token from localStorage
     */
    getToken() {
        // Get token from localStorage
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                return storedToken;
            }
        }

        // Return null if no token found - this will force login
        return null;
    }

    /**
     * Get current user info
     */
    getUser() {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('authUser');
            if (storedUser) {
                try {
                    return JSON.parse(storedUser);
                } catch (e) {
                    console.error('Error parsing stored user:', e);
                }
            }
        }

        // Fallback to admin user
        return {
            id: 9,
            username: 'admin',
            email: 'admin@odf-api.com',
            role: 'admin'
        };
    }

    /**
     * Login with username and password (Legacy - use AuthContext instead)
     */
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.data.token;
                this.user = data.data.user;

                // Store in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('authToken', this.token);
                    localStorage.setItem('authUser', JSON.stringify(this.user));
                    if (data.data.refreshToken) {
                        localStorage.setItem('refreshToken', data.data.refreshToken);
                    }
                }

                return { success: true, user: this.user, token: this.token };
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout and clear stored data
     */
    logout() {
        this.token = null;
        this.user = null;

        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Check if user has admin role
     */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }

    /**
     * Refresh token if needed
     */
    async refreshToken() {
        try {
            const refreshToken = typeof window !== 'undefined' 
                ? localStorage.getItem('refreshToken') 
                : null;

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.data.token;
                
                if (typeof window !== 'undefined') {
                    localStorage.setItem('authToken', this.token);
                }

                return { success: true, token: this.token };
            } else {
                throw new Error(data.error || 'Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            // If refresh fails, logout user
            this.logout();
            return { success: false, error: error.message };
        }
    }

    /**
     * Make authenticated API request
     */
    async apiRequest(url, options = {}) {
        const token = this.getToken();
        
        const requestOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, requestOptions);
            
            // If unauthorized, try to refresh token
            if (response.status === 401) {
                const refreshResult = await this.refreshToken();
                if (refreshResult.success) {
                    // Retry request with new token
                    requestOptions.headers['Authorization'] = `Bearer ${refreshResult.token}`;
                    return await fetch(url, requestOptions);
                } else {
                    throw new Error('Authentication failed');
                }
            }

            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }
}

// Create singleton instance
const authManager = new AuthManager();

export default authManager;
