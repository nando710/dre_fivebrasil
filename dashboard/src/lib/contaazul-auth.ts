import fs from 'fs';
import path from 'path';
import axios from 'axios';

const TOKEN_FILE_PATH = path.resolve(process.cwd(), 'data/ca-tokens.json');
const CONTA_AZUL_AUTH_API = 'https://auth.contaazul.com';
const CONTA_AZUL_AUTH_URL = 'https://auth.contaazul.com/login';

// Env variables (to be set in .env.local)
// CONTA_AZUL_CLIENT_ID
// CONTA_AZUL_CLIENT_SECRET
// CONTA_AZUL_REDIRECT_URI

interface TokenData {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    created_at: number;
}

export function getAuthUrl() {
    const clientId = process.env.CONTA_AZUL_CLIENT_ID;
    const redirectUri = process.env.CONTA_AZUL_REDIRECT_URI;
    const state = 'dre_state_123';
    const scopes = 'openid profile aws.cognito.signin.user.admin';
    return `${CONTA_AZUL_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&state=${state}&scope=${encodeURIComponent(scopes)}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenData> {
    const clientId = process.env.CONTA_AZUL_CLIENT_ID;
    const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;
    const redirectUri = process.env.CONTA_AZUL_REDIRECT_URI;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const payload = new URLSearchParams();
    payload.append('grant_type', 'authorization_code');
    payload.append('redirect_uri', redirectUri || '');
    payload.append('code', code);

    const response = await axios.post(`${CONTA_AZUL_AUTH_API}/oauth2/token`, payload, {
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const tokenData: TokenData = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        created_at: Date.now()
    };

    saveTokens(tokenData);
    return tokenData;
}

export async function refreshTokens(refreshToken: string): Promise<TokenData> {
    const clientId = process.env.CONTA_AZUL_CLIENT_ID;
    const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const payload = new URLSearchParams();
    payload.append('grant_type', 'refresh_token');
    payload.append('refresh_token', refreshToken);

    const response = await axios.post(`${CONTA_AZUL_AUTH_API}/oauth2/token`, payload, {
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const tokenData: TokenData = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        created_at: Date.now()
    };

    saveTokens(tokenData);
    return tokenData;
}

export function saveTokens(tokens: TokenData) {
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function getTokens(): TokenData | null {
    if (!fs.existsSync(TOKEN_FILE_PATH)) {
        return null;
    }
    const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
    try {
        return JSON.parse(data) as TokenData;
    } catch (e) {
        return null;
    }
}

export async function getValidAccessToken(): Promise<string | null> {
    const tokens = getTokens();
    if (!tokens) return null;

    const now = Date.now();
    // Check if expired (with 5 minutes buffer)
    const isExpired = now >= tokens.created_at + (tokens.expires_in * 1000) - 300000;

    if (isExpired && tokens.refresh_token) {
        try {
            const newTokens = await refreshTokens(tokens.refresh_token);
            return newTokens.access_token;
        } catch (error) {
            console.error('Failed to refresh Conta Azul tokens:', error);
            return null; // Might need to re-authenticate
        }
    }

    return tokens.access_token;
}
