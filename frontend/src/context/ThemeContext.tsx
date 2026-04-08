import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightTheme = {
    dark: false,
    colors: {
        background: '#f5f5f5',
        card: '#ffffff',
        text: '#333333',
        subText: '#666666',
        primary: '#4F46E5',
        border: '#E5E7EB',
        danger: '#EF4444',
        success: '#22c55e',
        headerText: '#111827',
        inputBg: '#ffffff'
    }
};

export const darkTheme = {
    dark: true,
    colors: {
        background: '#121212',
        card: '#1e1e1e',
        text: '#ffffff',
        subText: '#aaaaaa',
        primary: '#6366f1',
        border: '#333333',
        danger: '#CF6679',
        success: '#4ade80',
        headerText: '#ffffff',
        inputBg: '#2a2a2a'
    }
};

export const ThemeContext = createContext({
    theme: lightTheme,
    toggleTheme: () => { },
    isDark: false
});

export const ThemeProvider = ({ children }: any) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Load saved theme
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme === 'dark') {
                setIsDark(true);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        await AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const theme = isDark ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};
