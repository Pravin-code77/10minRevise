import React, { useContext, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register, isLoading } = useContext(AuthContext);

    const handleRegister = async () => {
        try {
            await register(name, email, password);
            Alert.alert('Success', 'Account created successfully! Please login.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (e: any) {
            let errorMsg = e.response?.data?.msg;
            if (!errorMsg) {
                if (e.message === 'Network Error') {
                    errorMsg = 'Cannot connect to the server. Please check your internet connection or try again later.';
                } else if (e.code === 'ECONNABORTED') {
                    errorMsg = 'Request timed out. The server took too long to respond.';
                } else {
                    errorMsg = e.message || 'Registration failed';
                }
            }
            Alert.alert('Error', errorMsg);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.wrapper}>
                <Text style={styles.title}>Create Account</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    placeholder="Name"
                    onChangeText={text => setName(text)}
                />
                <TextInput
                    style={styles.input}
                    value={email}
                    placeholder="Email"
                    onChangeText={text => setEmail(text)}
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
                    onPress={handleRegister}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Register</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.link}>Already have an account? Login</Text>
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

export default RegisterScreen;
