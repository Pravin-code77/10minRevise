import React, { useContext, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading } = useContext(AuthContext);

    const handleLogin = async () => {
        try {
            await login(email, password);
        } catch (e: any) {
            let errorMsg = e.response?.data?.msg;
            if (!errorMsg) {
                if (e.message === 'Network Error') {
                    errorMsg = 'Cannot connect to the server. Please check your internet connection or try again later.';
                } else if (e.code === 'ECONNABORTED') {
                    errorMsg = 'Request timed out. The server took too long to respond.';
                } else {
                    errorMsg = e.message || 'Login failed';
                }
            }
            Alert.alert('Error', errorMsg);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.wrapper}>
                <Text style={styles.title}>ReviseRight</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    placeholder="Email"
                    onChangeText={text => setEmail(text)}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    value={password}
                    placeholder="Password"
                    onChangeText={text => setPassword(text)}
                    secureTextEntry
                />
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: isLoading ? '#aaa' : '#4F46E5' }]}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.link}>Don't have an account? Register</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    wrapper: { padding: 20 },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { marginBottom: 12, borderWidth: 1, borderColor: '#bbb', borderRadius: 5, padding: 10 },
    link: { marginTop: 20, color: 'blue', textAlign: 'center' },
    button: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default LoginScreen;
