'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const router = useRouter();

    // Initialize auth state from localStorage
    useEffect(() => {
        const initializeAuth = () => {
            try {
                const storedToken = localStorage.getItem('authToken');
                const storedUser = localStorage.getItem('authUser');

                console.log('Initializing auth...', {
                    hasToken: !!storedToken,
                    hasUser: !!storedUser
                });

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    setIsAuthenticated(true);
                    console.log('User authenticated from localStorage');
                } else {
                    setIsAuthenticated(false);
                    console.log('No valid auth data in localStorage');
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                const { token: newToken, user: newUser, refreshToken } = data.data;

                console.log('Login successful, updating auth state...', {
                    user: newUser.username,
                    hasToken: !!newToken
                });

                // Update state
                setToken(newToken);
                setUser(newUser);
                setIsAuthenticated(true);

                // Store in localStorage
                localStorage.setItem('authToken', newToken);
                localStorage.setItem('authUser', JSON.stringify(newUser));
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                }

                console.log('Auth state updated, user should be authenticated');
                return { success: true, user: newUser };
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = async (skipRedirect = false) => {
        try {
            // Notify backend about logout
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                });
            }
        } catch (error) {
            console.warn('Backend logout failed:', error);
        } finally {
            // Clear state and localStorage regardless of backend response
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);

            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            localStorage.removeItem('refreshToken');

            // Only redirect if not explicitly skipped (to prevent navigation loops)
            if (!skipRedirect && typeof window !== 'undefined') {
                // Use setTimeout to prevent immediate navigation conflicts
                setTimeout(() => {
                    router.push('/login');
                }, 100);
            }
        }
    };

    const refreshToken = async () => {
        // Prevent multiple simultaneous refresh attempts
        if (isRefreshing) {
            return { success: false, error: 'Refresh already in progress' };
        }

        try {
            setIsRefreshing(true);

            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (!storedRefreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
            });

            const data = await response.json();

            if (data.success) {
                const { token: newToken, refreshToken: newRefreshToken } = data.data;

                setToken(newToken);
                localStorage.setItem('authToken', newToken);

                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }

                return { success: true, token: newToken };
            } else {
                throw new Error(data.error || 'Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            // If refresh fails, logout user (but don't redirect immediately)
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);

            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            localStorage.removeItem('refreshToken');

            return { success: false, error: error.message };
        } finally {
            setIsRefreshing(false);
        }
    };

    const apiRequest = async (url, options = {}) => {
        const currentToken = token || localStorage.getItem('authToken');

        const requestOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(currentToken && { 'Authorization': `Bearer ${currentToken}` }),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, requestOptions);

            // If unauthorized and we have a token, try to refresh (but only once)
            if (response.status === 401 && currentToken && !isRefreshing && !options._isRetry) {
                const refreshResult = await refreshToken();
                if (refreshResult.success) {
                    // Retry request with new token (mark as retry to prevent infinite loops)
                    const retryOptions = {
                        ...options,
                        _isRetry: true,
                        headers: {
                            ...options.headers,
                            'Authorization': `Bearer ${refreshResult.token}`,
                        },
                    };
                    return await fetch(url, retryOptions);
                } else {
                    // Refresh failed, logout without immediate redirect to prevent navigation loops
                    await logout(true); // Skip redirect in logout
                    throw new Error('Authentication failed');
                }
            }

            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    };

    const isAdmin = () => {
        return user && user.role === 'admin';
    };

    const getToken = () => {
        return token || localStorage.getItem('authToken');
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
        refreshToken,
        apiRequest,
        isAdmin,
        getToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
