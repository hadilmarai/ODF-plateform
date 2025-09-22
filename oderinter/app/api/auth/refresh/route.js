import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request) {
    try {
        const body = await request.json();
        const { refreshToken } = body;

        // Validate input
        if (!refreshToken) {
            return NextResponse.json(
                { success: false, error: 'Refresh token is required' },
                { status: 400 }
            );
        }

        // Forward the refresh request to the backend API
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Return the successful refresh response
            return NextResponse.json({
                success: true,
                data: {
                    token: data.data.token,
                    refreshToken: data.data.refreshToken,
                },
            });
        } else {
            // Return the error from the backend
            return NextResponse.json(
                { success: false, error: data.error || 'Token refresh failed' },
                { status: response.status || 401 }
            );
        }
    } catch (error) {
        console.error('Token refresh API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
