import { MessageInstance } from "antd/es/message/interface";
import { get, post } from "."
import { Session } from '@supabase/supabase-js';

export const fetchExistingAccountsApi = async (message: MessageInstance, session: Session) => {
    const resp = get({
        url: '/accounts?created=true',
        session,
        onError: (status, msg) => {
            console.error(status, msg)
            message.error(msg)
        }
    });
    return resp;
}

export const fetchNewAccountsApi = async (message: MessageInstance, session: Session) => {
    const resp = get({
        url: '/accounts?created=false',
        session,
        onError: (status, msg) => {
            console.error(status, msg)
            message.error(msg)
        }
    });
    return resp;
}

export const createAccountApi = async (
    doctor: { id: string, name: string, branch_id: string, email: string, password?: string }, 
    message: MessageInstance, 
    session: Session
) => {
    const resp = post({
        url: '/doctor',
        body: doctor,
        session,
        onError: (status, msg) => {
            console.error(status, msg)
            message.error(msg)
        }
    });
    return resp;
}

export const deleteAccountsApi = async (
    ids: string[], 
    message: MessageInstance, 
    session: Session
) => {
    const resp = post({
        url: '/accounts/delete',
        body: { ids },
        session,
        onError: (status, msg) => {
            console.error(status, msg)
            message.error(msg)
        }
    });
    return resp;
}
