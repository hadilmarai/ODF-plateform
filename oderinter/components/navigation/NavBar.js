'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

export default function NavBar() {
    const { user, isAuthenticated, logout } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setIsUserMenuOpen(false);
    };

    return (
        <nav className="bg-[#f9bd12ff] text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left side - Logo and main navigation */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Link href="/" className="text-xl font-bold hover:text-orange-200">
                                Funding Analysis
                            </Link>
                        </div>
                        
                        {/* Desktop navigation */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link 
                                    href="/" 
                                    className="hover:bg-orange-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Dashboard
                                </Link>
                                <Link 
                                    href="/uk" 
                                    className="hover:bg-orange-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    UK Opportunities
                                </Link>
                                <Link 
                                    href="/eu" 
                                    className="hover:bg-orange-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    EU Opportunities
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right side - User menu */}
                    <div className="flex items-center">
                        {isAuthenticated ? (
                            <div className="relative">
                                {/* User menu button */}
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center space-x-2 hover:bg-orange-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    <div className="w-8 h-8 bg-orange-700 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium">
                                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                    <span className="hidden sm:block">{user?.username}</span>
                                    <svg 
                                        className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* User dropdown menu */}
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                        <div className="px-4 py-2 text-sm text-gray-700 border-b">
                                            <div className="font-medium">{user?.username}</div>
                                            <div className="text-gray-500">{user?.email}</div>
                                            {user?.role && (
                                                <div className="text-xs text-orange-600 font-medium uppercase">
                                                    {user.role}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Sign out
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-orange-700 hover:bg-orange-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Sign In
                            </Link>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden ml-4 p-2 rounded-md hover:bg-orange-700 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-orange-600">
                            <Link
                                href="/"
                                className="block hover:bg-orange-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/uk"
                                className="block hover:bg-orange-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                UK Opportunities
                            </Link>
                            <Link
                                href="/eu"
                                className="block hover:bg-orange-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                EU Opportunities
                            </Link>
                            
                            {!isAuthenticated && (
                                <Link
                                    href="/login"
                                    className="block bg-orange-700 hover:bg-orange-800 px-3 py-2 rounded-md text-base font-medium transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Click outside to close menus */}
            {(isUserMenuOpen || isMobileMenuOpen) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsMobileMenuOpen(false);
                    }}
                />
            )}
        </nav>
    );
}
