import React, { useContext } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreens from '../screens/HomeScreen';
import CreateFlashcardScreen from '../screens/CreateFlashcardScreen';
import RevisionScreen from '../screens/RevisionScreen';
import CompilerScreen from '../screens/CompilerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExportDataScreen from '../screens/ExportDataScreen';
import { RootStackParamList, AuthStackParamList, AppTabParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const AuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
};

const AppTabs = () => {
    const { theme, isDark } = useContext(ThemeContext);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopColor: isDark ? '#fff' : '#000',
                    borderTopWidth: 0.2,
                    elevation: 0,
                    height: 70,
                    paddingBottom: Platform.OS === 'android' ? 8 : 10,
                },
                tabBarBackground: () => (
                    <View style={{
                        flex: 1,
                        backgroundColor: theme.colors.background,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        borderTopWidth: 0,
                        overflow: 'hidden',
                    }} />
                ),
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;

                    if (route.name === 'Home') iconName = 'home';
                    else if (route.name === 'Create') iconName = 'add';
                    else if (route.name === 'Revision') iconName = 'albums';
                    else if (route.name === 'Compiler') iconName = 'code-slash';
                    else if (route.name === 'Profile') iconName = 'person';

                    if (focused) {
                        return (
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: theme.colors.text, // Invert colors for active state
                                justifyContent: 'center',
                                alignItems: 'center',
                                elevation: 5,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 3,

                            }}>
                                <Ionicons name={iconName} size={20} color={theme.colors.background} />

                            </View>
                        );
                    }

                    // Inactive
                    // Use outline icons for some if available, or just the icon
                    const outlineName = iconName === 'code-slash' ? 'code-slash-outline' : iconName + '-outline';
                    // 'add-outline' exists? yes. 'albums-outline'? yes.

                    return <Ionicons name={outlineName as any} size={24} color={theme.colors.subText} />;
                },
                tabBarActiveTintColor: isDark ? '#fff' : '#000',
                tabBarInactiveTintColor: theme.colors.subText,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreens} />
            <Tab.Screen name="Create" component={CreateFlashcardScreen} />
            <Tab.Screen name="Revision" component={RevisionScreen} />
            <Tab.Screen name="Compiler" component={CompilerScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

const AppRootStack = () => {
    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="AppTabs" component={AppTabs} />
            <RootStack.Screen name="ExportData" component={ExportDataScreen} options={{ presentation: 'modal' }} />
        </RootStack.Navigator>
    );
};

const AppNav = () => {
    const { isLoading, userToken } = useContext(AuthContext);
    const { isDark } = useContext(ThemeContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const navTheme = {
        dark: isDark,
        colors: {
            primary: isDark ? '#6366f1' : '#4F46E5',
            background: isDark ? '#121212' : '#f5f5f5',
            card: isDark ? '#121212' : '#f5f5f5',
            text: isDark ? '#ffffff' : '#333333',
            border: isDark ? '#121212' : '#f5f5f5',
            notification: isDark ? '#6366f1' : '#4F46E5',
        },
    };

    return (
        <NavigationContainer theme={navTheme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {userToken ? <AppRootStack /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNav;
