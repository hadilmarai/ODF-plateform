import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        // Validate input
        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Forward the login request to the backend API
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Return the successful login response
            return NextResponse.json({
                success: true,
                data: {
                    token: data.data.token,
                    refreshToken: data.data.refreshToken,
                    user: data.data.user,
                },
            });
        } else {
            // Return the error from the backend
            return NextResponse.json(
                { success: false, error: data.error || 'Login failed' },
                { status: response.status || 401 }
            );
        }
    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
