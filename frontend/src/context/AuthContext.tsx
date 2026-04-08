import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';


export const AuthContext = createContext<any>({
    login: () => { },
    register: () => { },
    logout: () => { },
    isLoading: false,
    userToken: null
});

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // BASE_URL handled by api instance

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            const token = res.data.token;
            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);
            // Fetch user info after login
            const userRes = await api.get('/auth/me', { headers: { 'x-auth-token': token } });
            setUserInfo(userRes.data);
            console.log('Login success');
        } catch (e: any) {
            console.log(`Login error: ${e.response?.data?.msg || e.message}`);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            await api.post('/auth/register', { name, email, password });
            console.log('Register success');
        } catch (e: any) {
            console.log(`Register error: ${e.response?.data?.msg || e.message}`);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setIsLoading(true);
        setUserToken(null);
        setUserInfo(null);
        AsyncStorage.removeItem('userToken');
        setIsLoading(false);
    };

    const isLoggedIn = async () => {
        try {
            setIsLoading(true);
            let token = await AsyncStorage.getItem('userToken');
            setUserToken(token);
            if (token) {
                const userRes = await api.get('/auth/me', { headers: { 'x-auth-token': token } });
                setUserInfo(userRes.data);
            }
            setIsLoading(false);
        } catch (e: any) {
            console.log(`isLogged in failed: ${e.response?.data?.msg || e.message}`);
            // If token invalid, clear it
            setUserToken(null);
            AsyncStorage.removeItem('userToken');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ login, register, logout, isLoggedIn, isLoading, userToken, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};
