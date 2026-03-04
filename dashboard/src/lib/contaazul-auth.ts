import fs from 'fs';
import path from 'path';
import axios from 'axios';

const TOKEN_FILE_PATH = path.resolve(process.cwd(), 'data/ca-tokens.json');
const CONTA_AZUL_API = 'https://api.contaazul.com';
const CONTA_AZUL_AUTH_URL = 'https://api.contaazul.com/auth/authorize';

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
    // scope=financeiro
    return `${CONTA_AZUL_AUTH_URL}?redirect_uri=${encodeURIComponent(redirectUri || '')}&client_id=${clientId}&scope=financeiro&state=${state}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenData> {
    const clientId = process.env.CONTA_AZUL_CLIENT_ID;
    const clientSecret = process.env.CONTA_AZUL_CLIENT_SECRET;
    const redirectUri = process.env.CONTA_AZUL_REDIRECT_URI;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(`${CONTA_AZUL_API}/oauth2/token`, null, {
        params: {
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
        },
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

    const response = await axios.post(`${CONTA_AZUL_API}/oauth2/token`, null, {
        params: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        },
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
