import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

const getBaseUrl = () => {
    // 1. Check for explicit environment variable
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. Hardcoded Production Fallback (Ensures EAS builds work even if .env is missing)
    if (!__DEV__) {
        return 'https://reviseright-backend.onrender.com/api';
    }


    // 2. Web specific logic
    if (Platform.OS === 'web') {
        const isLocalHost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        if (!isLocalHost) {
            return '/api'; // Guarantee relative web usage in live Vercel deploy
        }
    }

    // 3. Local Development (Mobile)
    // Dynamically get the host IP from Expo, fallback to current network IP if not available
    const hostUri = Constants.expoConfig?.hostUri;
    const lanIp = hostUri ? hostUri.split(':')[0] : '10.213.37.5';
    const localUrl = `http://${lanIp}:5000/api`;
    console.log('[API] Using Local Development URL:', localUrl);
    return localUrl;
};


const BASE_URL = getBaseUrl();
console.log('API Base URL:', BASE_URL);

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 60000, // 60 second timeout for AI operations
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const flashcardService = {
    createSet: (data: { title: string; description: string; cards: { term: string; definition: string }[]; type: string }) =>
        api.post('/flashcards/sets', data),
    updateSet: (id: string, data: { title: string; description: string; cards: { id?: string; term: string; definition: string }[]; type: string }) =>
        api.put(`/flashcards/sets/${id}`, data),
    getAllSets: () => api.get('/flashcards/sets'),
    getSetDetails: (id: string) => api.get(`/flashcards/sets/${id}`),
    getStats: () => api.get('/flashcards/stats'),

    // ── Delete / Add ──────────────────────────────────────────────
    deleteSet: (setId: string) => api.delete(`/flashcards/sets/${setId}`),
    deleteCard: (setId: string, cardId: string) =>
        api.delete(`/flashcards/sets/${setId}/cards/${cardId}`),
    addCardToSet: (setId: string, data: { term: string; definition: string; type?: string }) =>
        api.post(`/flashcards/sets/${setId}/cards`, data),

    // Legacy
    create: (data: { front: string; rawText: string; type: 'visualize' | 'simplify' | 'raw' }) =>
        api.post('/flashcards', data),
    getAll: () => api.get('/flashcards'),
    getDue: () => api.get('/flashcards/due'),
    updateStatus: (id: string, status: 'learning' | 'mastered') =>
        api.put(`/flashcards/${id}/status`, { status }),
    getAllFlashcards: () => api.get('/flashcards/due'),
};

export const authService = {
    getStreak: () => api.get('/auth/streak'),
    updateDetails: (data: { name?: string; email?: string; reminderEnabled?: boolean; reminderTime?: string }) => api.put('/auth/update', data),
    updatePassword: (data: { oldPassword: string; newPassword: string }) => api.put('/auth/password', data),
    deleteAccount: () => api.delete('/auth/delete'),
};

export const compilerService = {
    run: (data: { language: string; code: string }) =>
        api.post('/compiler/run', data),
};

export default api;
