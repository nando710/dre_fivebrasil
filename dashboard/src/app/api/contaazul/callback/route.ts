import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/contaazul-auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
        return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    try {
        await exchangeCodeForTokens(code);
        const baseUri = process.env.CONTA_AZUL_REDIRECT_URI || 'http://localhost:3000';
        const urlObject = new URL(baseUri);
        const redirectDashboardUrl = `${urlObject.protocol}//${urlObject.host}/conta-azul`;

        return NextResponse.redirect(redirectDashboardUrl);
    } catch (error: any) {
        console.error('Callback error:', error?.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to exchange code for tokens', details: error?.response?.data }, { status: 500 });
    }
}
