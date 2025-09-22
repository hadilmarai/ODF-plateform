import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // For logout, we mainly handle client-side token removal
        // But we can also notify the backend if needed
        
        const body = await request.json();
        const { token } = body;

        // Optional: Notify backend about logout (if backend maintains token blacklist)
        if (token) {
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
            } catch (error) {
                // Ignore backend logout errors - client-side logout is more important
                console.warn('Backend logout failed:', error.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
