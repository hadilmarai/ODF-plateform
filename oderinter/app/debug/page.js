'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DebugPage() {
    const { user, token, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const [localStorageData, setLocalStorageData] = useState({});

    useEffect(() => {
        // Check localStorage data
        const authToken = localStorage.getItem('authToken');
        const authUser = localStorage.getItem('authUser');
        const refreshToken = localStorage.getItem('refreshToken');

        setLocalStorageData({
            authToken: authToken ? 'Present' : 'Missing',
            authUser: authUser ? JSON.parse(authUser) : 'Missing',
            refreshToken: refreshToken ? 'Present' : 'Missing'
        });
    }, []);

    const handleClearStorage = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('refreshToken');
        window.location.reload();
    };

    const handleGoToLogin = () => {
        router.push('/login');
    };

    const handleGoToHome = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-center">Authentication Debug Page</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Auth Context State */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Auth Context State</h2>
                        <div className="space-y-2">
                            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                            <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
                            <p><strong>User:</strong> {user ? user.username : 'None'}</p>
                            <p><strong>Token:</strong> {token ? 'Present' : 'Missing'}</p>
                            <p><strong>User Role:</strong> {user?.role || 'None'}</p>
                        </div>
                    </div>

                    {/* LocalStorage Data */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">LocalStorage Data</h2>
                        <div className="space-y-2">
                            <p><strong>Auth Token:</strong> {localStorageData.authToken}</p>
                            <p><strong>Auth User:</strong> {
                                typeof localStorageData.authUser === 'object' 
                                    ? localStorageData.authUser.username 
                                    : localStorageData.authUser
                            }</p>
                            <p><strong>Refresh Token:</strong> {localStorageData.refreshToken}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 text-center space-x-4">
                    <button 
                        onClick={handleGoToLogin}
                        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                    >
                        Go to Login
                    </button>
                    <button 
                        onClick={handleGoToHome}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                    >
                        Go to Home
                    </button>
                    <button 
                        onClick={handleClearStorage}
                        className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
                    >
                        Clear Storage & Reload
                    </button>
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-yellow-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Debug Instructions:</h3>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Next.js App:</strong> http://localhost:3000 (this app)</li>
                        <li><strong>API Server:</strong> http://localhost:5000 (backend only)</li>
                        <li><strong>Login Page:</strong> http://localhost:3000/login</li>
                        <li><strong>Debug Page:</strong> http://localhost:3000/debug (this page)</li>
                    </ul>
                </div>

                {/* Current URL */}
                <div className="mt-4 bg-blue-50 p-4 rounded">
                    <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
                </div>
            </div>
        </div>
    );
}
