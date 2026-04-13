import { Session } from "@supabase/supabase-js";
import { message } from "antd";
const apiUrl = import.meta.env.VITE_ADMIN_API_URL

const getHeaders = (session: Session | null | undefined) => {
    if (!session) {
        throw new Error('Session is required');
    }

    return {
        'Authorization': `Bearer ${session?.access_token}`
    }
}

export const handleDownload = async (response: Response, filename: string) => {
    try {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        message.error('Failed to download file');
    }
};

export const updateDeliveryStatus = async (session: Session | null | undefined, formData: FormData) => {
    const response = await fetch(`${apiUrl}/api/delivery/dispatch/update_delivery_status`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
        headers: getHeaders(session)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update delivery status');
    }

    return response.json();
}

export const exportDeliverySheet = async (session: Session | null | undefined, date: string | null, isMigrant: boolean) => {
    const baseUrl = `${apiUrl}/api/delivery/logistic/export_delivery_sheet`;
    const params = new URLSearchParams();
    if (date) {
        params.append('date', date);
    }
    params.append('is_migrant', isMigrant.toString());

    const triggerUrl = `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(triggerUrl, {
        headers: getHeaders(session)
    });
    
    let filename = `${isMigrant ? 'migrant' : 'private'}-delivery-sheet-${date ? date : 'upcoming'}.xlsx`;
    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
    }

    await handleDownload(response, filename);

    return response;
}

export const exportEndDayReport = async (session: Session | null | undefined, date: string) => {
    const response = await fetch(`${apiUrl}/api/delivery/logistic/export_end_day_report?date=${date}`, {
            headers: getHeaders(session)
    });

    await handleDownload(response, `end-day-report-${date}.xlsx`);
    return response;
}

export const downloadDeliveryNote = async (session: Session | null | undefined, deliveryNoteKey: string, filename: string) => {
    const response = await fetch(`${apiUrl}/api/delivery/logistic/download_delivery_note?delivery_note_key=${deliveryNoteKey}`, {
        headers: getHeaders(session)
    });

    await handleDownload(response, `${filename}.pdf`);
    return response;
}

export const downloadAllDeliveryNotes = async (session: Session | null | undefined, date: string) => {
    const response = await fetch(`${apiUrl}/api/delivery/logistic/download_delivery_note_zip?date=${date}`, {
        headers: getHeaders(session)
    });
    await handleDownload(response, `delivery-notes-${date}.zip`);
    return response;
}
