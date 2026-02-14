import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apolloClient } from '../lib/apollo';
import { logStart } from '../utils/log';
import { SIGNUP, LOGIN, type User, type AuthPayload } from '../graphql';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signup: (email: string, password: string) => Promise<AuthPayload>;
    login: (email: string, password: string) => Promise<AuthPayload>;
    logout: () => void;
    setToken: (token: string, user: User) => void;
}

// Using centralized GraphQL operations from Phase 1

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load token and user from localStorage on mount
    useEffect(() => {
        const timer = logStart('[AUTH]', 'init-check');

        try {
            const storedToken = localStorage.getItem('sv.auth.token');
            const storedUser = localStorage.getItem('sv.auth.user');

            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser) as User;
                setTokenState(storedToken);
                setUser(parsedUser);
                timer.ok({ hasToken: true, userEmail: parsedUser.email });
            } else {
                timer.ok({ hasToken: false });
            }
        } catch (error) {
            timer.err(error);
            // Clear corrupted data
            localStorage.removeItem('sv.auth.token');
            localStorage.removeItem('sv.auth.user');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setToken = (newToken: string, newUser: User) => {
        const timer = logStart('[AUTH]', 'set-token', { userEmail: newUser.email });

        try {
            localStorage.setItem('sv.auth.token', newToken);
            localStorage.setItem('sv.auth.user', JSON.stringify(newUser));
            setTokenState(newToken);
            setUser(newUser);
            timer.ok({ stored: true });
        } catch (error) {
            timer.err(error);
            throw new Error('Failed to store authentication data');
        }
    };

    const signup = async (email: string, password: string): Promise<AuthPayload> => {
        const timer = logStart('[AUTH]', 'signup', { email });

        try {
            const result = await apolloClient.mutate({
                mutation: SIGNUP,
                variables: { email, password },
            });

            const authPayload = result.data?.signup as AuthPayload;
            if (!authPayload) {
                throw new Error('No signup data returned');
            }

            setToken(authPayload.token, authPayload.user);

            timer.ok({ userId: authPayload.user.id, role: authPayload.user.role });
            return authPayload;
        } catch (error) {
            timer.err(error);
            throw error;
        }
    };

    const login = async (email: string, password: string): Promise<AuthPayload> => {
        const timer = logStart('[AUTH]', 'login', { email });

        try {
            const result = await apolloClient.mutate({
                mutation: LOGIN,
                variables: { email, password },
            });

            const authPayload = result.data?.login as AuthPayload;
            if (!authPayload) {
                throw new Error('No login data returned');
            }

            setToken(authPayload.token, authPayload.user);

            timer.ok({ userId: authPayload.user.id, role: authPayload.user.role });
            return authPayload;
        } catch (error) {
            timer.err(error);
            throw error;
        }
    };

    const logout = () => {
        const timer = logStart('[AUTH]', 'logout');

        try {
            // Clear localStorage
            localStorage.removeItem('sv.auth.token');
            localStorage.removeItem('sv.auth.user');

            // Clear any other sv.* keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sv.')) {
                    localStorage.removeItem(key);
                }
            });

            // Reset Apollo cache
            apolloClient.resetStore();

            // Clear state
            setTokenState(null);
            setUser(null);

            timer.ok({ clearedKeys: Object.keys(localStorage).filter(k => k.startsWith('sv.')).length });
        } catch (error) {
            timer.err(error);
            // Still clear state even if localStorage fails
            setTokenState(null);
            setUser(null);
        }
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        signup,
        login,
        logout,
        setToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};