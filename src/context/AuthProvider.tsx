import { AuthError, Session, User } from '@supabase/supabase-js';
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import supabase from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { Role } from '../services/client';

// AUTH CONTEXT

type AuthContextType = {
    user?: User;
    login: ({ email, password }: { email: string; password: string;}) => Promise<{ data: { user: User | null; session: Session | null; }; error: AuthError | null; }>;
    logout: () => void;
    session?: Session | null;
    role: Role;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate();
    // 3 States (1) undefined = loading, (2) null = not logged in, (3) session = logged in
    const [ session, setSession ] = useState<Session | null>();

    useEffect(() => {
        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    const login = async ({ email, password }: { email: string; password: string }) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Login error:', error.message);
        } else {
            if (data?.user?.user_metadata?.role === 'doctor') {
                message.error('Doctor accounts are not allowed to login via the web portal. Please use the PinnacleSG+ (Doctor) mobile app.');
                await supabase.auth.signOut();
            } else {
                setSession(data?.session || null);
            }
        }
        return { data, error };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    }

    const role = (session?.user?.user_metadata?.role ?? 'superadmin') as Role;

    return (
        <AuthContext.Provider value={{
                user: session?.user, 
                login, 
                logout, 
                session,
                role,
            }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
