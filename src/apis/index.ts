export const apiUrl = import.meta.env.VITE_ADMIN_API_URL + '/api/admin';
import { Session } from '@supabase/supabase-js';

export const getHeaders = (session: Session) => {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
    }
}

export type onErrorCallback = (status: number, msg: string) => void

export const get = async ({ url, body, session, onError }: { url: string, body?: object, session: Session, onError: onErrorCallback }) => {
    try {
        let combinedUrl = `${apiUrl}${url}`;
        if (body) {
            // Converts the body object values to strings
            const strBody = JSON.parse(JSON.stringify(body, (_, v) => v && typeof v === 'object' ? v : '' + v));
            combinedUrl += '?' + new URLSearchParams(strBody);
        }
        console.log(`GET ${combinedUrl}`);

        const headers = getHeaders(session);
        const response = await fetch(combinedUrl, {
            method: 'GET',
            headers,
        });
        if (response.status !== 200) {
            onError(response.status, (await response.json())?.detail);
            return;
        }
        return await response.json();
    } catch (error: any) {
        onError(500, error.toString());
    }
}

export const post = async ({ url, body, session, onError }: { url: string, body: object, session: Session, onError: onErrorCallback }) => {
    try {
        const combinedUrl = `${apiUrl}${url}`;
        console.log(`POST ${combinedUrl} ${JSON.stringify(body)}`);
        const headers = getHeaders(session);
        const response = await fetch(combinedUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        
        if (response.status !== 200) {
            onError(response.status, (await response.json())?.detail);
            return;
        }
        return await response.json();
    } catch (error: any) {
        onError(500, error.toString());
    }
}
