import { NextResponse } from 'next/server';
import { getValidAccessToken, getAuthUrl } from '@/lib/contaazul-auth';

export async function GET() {
    try {
        const token = await getValidAccessToken();
        const authUrl = getAuthUrl();

        return NextResponse.json({
            isConnected: !!token,
            authUrl: authUrl
        });
    } catch (error) {
        return NextResponse.json({ isConnected: false, error: 'Failed to check status' }, { status: 500 });
    }
}
