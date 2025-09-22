'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

// Loading component for authentication check
const AuthLoadingSpinner = () => (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f9bd12ff] mb-4"></div>
        <p className="text-gray-600">Checking authentication...</p>
    </div>
);

// Unauthorized access component
const UnauthorizedAccess = ({ requiredRole }) => (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-6">
                    {requiredRole 
                        ? `You need ${requiredRole} privileges to access this page.`
                        : 'You need to be logged in to access this page.'
                    }
                </p>
                <button
                    onClick={() => window.location.href = '/login'}
                    className="w-full bg-[#f9bd12ff] hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                    Go to Login
                </button>
            </div>
        </div>
    </div>
);

/**
 * Higher-order component that protects routes requiring authentication
 * @param {React.Component} WrappedComponent - The component to protect
 * @param {Object} options - Protection options
 * @param {string} options.requiredRole - Required user role (optional)
 * @param {boolean} options.redirectToLogin - Whether to redirect to login (default: true)
 */
const withAuth = (WrappedComponent, options = {}) => {
    const { requiredRole, redirectToLogin = true } = options;

    return function ProtectedComponent(props) {
        const { isAuthenticated, loading, user } = useAuth();
        const router = useRouter();
        const [isChecking, setIsChecking] = useState(true);
        const [hasRedirected, setHasRedirected] = useState(false);

        useEffect(() => {
            console.log('ProtectedRoute check:', {
                loading,
                isAuthenticated,
                hasRedirected,
                user: user?.username,
                requiredRole
            });

            if (!loading && !hasRedirected) {
                if (!isAuthenticated) {
                    console.log('User not authenticated, redirecting to login...');
                    if (redirectToLogin) {
                        setHasRedirected(true);
                        // Use setTimeout to prevent navigation conflicts
                        setTimeout(() => {
                            router.push('/login');
                        }, 100);
                    } else {
                        setIsChecking(false);
                    }
                } else if (requiredRole && user?.role !== requiredRole) {
                    console.log('User role insufficient:', user?.role, 'required:', requiredRole);
                    setIsChecking(false);
                } else {
                    console.log('User authenticated, allowing access');
                    setIsChecking(false);
                }
            }
        }, [isAuthenticated, loading, user, router, hasRedirected]);

        // Show loading spinner while checking authentication
        if (loading || isChecking) {
            return <AuthLoadingSpinner />;
        }

        // Show unauthorized if not authenticated and not redirecting
        if (!isAuthenticated && !redirectToLogin) {
            return <UnauthorizedAccess />;
        }

        // Show unauthorized if role requirement not met
        if (isAuthenticated && requiredRole && user?.role !== requiredRole) {
            return <UnauthorizedAccess requiredRole={requiredRole} />;
        }

        // Show the protected component if all checks pass
        if (isAuthenticated) {
            return <WrappedComponent {...props} />;
        }

        // Fallback (shouldn't reach here if redirectToLogin is true)
        return <AuthLoadingSpinner />;
    };
};

/**
 * Hook-based protected route component
 * Use this as a wrapper component in your pages
 */
export const ProtectedRoute = ({ 
    children, 
    requiredRole, 
    redirectToLogin = true,
    fallback = null 
}) => {
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                if (redirectToLogin) {
                    router.push('/login');
                } else {
                    setIsChecking(false);
                }
            } else if (requiredRole && user?.role !== requiredRole) {
                setIsChecking(false);
            } else {
                setIsChecking(false);
            }
        }
    }, [isAuthenticated, loading, user, router, redirectToLogin, requiredRole]);

    // Show loading spinner while checking authentication
    if (loading || isChecking) {
        return fallback || <AuthLoadingSpinner />;
    }

    // Show unauthorized if not authenticated and not redirecting
    if (!isAuthenticated && !redirectToLogin) {
        return <UnauthorizedAccess />;
    }

    // Show unauthorized if role requirement not met
    if (isAuthenticated && requiredRole && user?.role !== requiredRole) {
        return <UnauthorizedAccess requiredRole={requiredRole} />;
    }

    // Show the protected content if all checks pass
    if (isAuthenticated) {
        return children;
    }

    // Fallback (shouldn't reach here if redirectToLogin is true)
    return fallback || <AuthLoadingSpinner />;
};

export default withAuth;
