import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, ScrollView, Switch, Alert, Modal, TextInput, Clipboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { flashcardService, authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = BottomTabScreenProps<AppTabParamList, 'Profile'>;

const ProfileScreen = ({ navigation }: Props) => {
    const { logout, userInfo, isLoggedIn } = useContext(AuthContext);
    const { theme, toggleTheme, isDark } = useContext(ThemeContext);

    const [stats, setStats] = useState({ totalSets: 0, cardsMastered: 0, streak: 0 });
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState("09:00");

    // Edit Profile State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editReminderTime, setEditReminderTime] = useState('');

    // Change Password State
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Time Picker State
    const [showTimePicker, setShowTimePicker] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await flashcardService.getStats();
            setStats(res.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    useEffect(() => {
        const loadSettings = async () => {
            // Priority 1: Use database/userInfo if available
            if (userInfo) {
                setNotificationsEnabled(userInfo.reminderEnabled || false);
                setReminderTime(userInfo.reminderTime || "09:00");

                // Also update local cache
                await AsyncStorage.setItem('dailyReminderEnabled', userInfo.reminderEnabled ? 'true' : 'false');
                await AsyncStorage.setItem('dailyReminderTime', userInfo.reminderTime || "09:00");
            } else {
                // Priority 2: Fallback to local storage (e.g. offline or during initial load)
                const enabled = await AsyncStorage.getItem('dailyReminderEnabled');
                const time = await AsyncStorage.getItem('dailyReminderTime');
                setNotificationsEnabled(enabled === 'true');
                if (time) setReminderTime(time);
            }
        };
        loadSettings();

        const unsubscribe = navigation.addListener('focus', () => {
            fetchStats();
        });
        return unsubscribe;
    }, [navigation]);

    const handleUpdateProfile = async () => {
        // Validate Time
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(editReminderTime)) {
            Alert.alert("Invalid Time", "Please use HH:MM format (24h). Example: 14:30");
            return;
        }

        try {
            // 1. Update Server Data (Sync reminderTime to DB)
            await authService.updateDetails({
                name: editName,
                email: editEmail,
                reminderTime: editReminderTime
            });

            // 2. Update Local Settings (Reminder Time)
            await AsyncStorage.setItem('dailyReminderTime', editReminderTime);
            setReminderTime(editReminderTime);

            // 3. Reschedule if enabled
            if (notificationsEnabled) {
                await notificationService.scheduleDailyReminder(editReminderTime);
            }

            Alert.alert("Success", "Profile and settings updated!");
            setEditModalVisible(false);
            isLoggedIn(); // Refresh user context
        } catch (error: any) {
            console.error('[DEBUG] Update Profile Error:', error);
            if (error.response) {
                console.error('[DEBUG] Response Data:', error.response.data);
                console.error('[DEBUG] Status:', error.response.status);
            }
            Alert.alert("Error", error.response?.data?.msg || "Update failed");
        }
    };

    const handleChangePassword = async () => {
        try {
            await authService.updatePassword({ oldPassword, newPassword });
            Alert.alert("Success", "Password updated!");
            setPasswordModalVisible(false);
            setOldPassword('');
            setNewPassword('');
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.msg || "Update failed");
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure? This action cannot be undone and deletes all your sets.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        try {
                            await authService.deleteAccount();
                            logout();
                        } catch (error) {
                            Alert.alert("Error", "Could not delete account.");
                        }
                    }
                }
            ]
        );
    };

    const handleExportData = () => {
        // Navigate to the new Export Data Screen (Modal)
        // @ts-ignore - We know this route exists in the parent navigator
        navigation.navigate('ExportData');
    };

    const toggleReminder = async (value: boolean) => {
        if (value) {
            const hasPermission = await notificationService.requestPermissions();
            if (!hasPermission) {
                Alert.alert("Permission Required", "Please enable notifications in your phone settings to receive daily reminders.");
                return;
            }
            await notificationService.scheduleDailyReminder(reminderTime);
        } else {
            await notificationService.cancelAll();
        }

        // Sync setting with Database
        try {
            await authService.updateDetails({ reminderEnabled: value });
        } catch (e) {
            console.error("Failed to sync reminder status to DB:", e);
        }

        setNotificationsEnabled(value);
        await AsyncStorage.setItem('dailyReminderEnabled', value ? 'true' : 'false');
    };

    const openEditModal = () => {
        setEditName(userInfo?.name || '');
        setEditEmail(userInfo?.email || '');
        setEditReminderTime(reminderTime);
        setEditModalVisible(true);
    };

    const formatAMPM = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${displayHours}:${displayMinutes} ${ampm}`;
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            setEditReminderTime(`${hours}:${minutes}`);
        }
    };

    const StatsCard = ({ label, value, icon, color }: any) => (
        <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
            <Ionicons name={icon} size={24} color={color || theme.colors.primary} style={{ marginBottom: 5 }} />
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>{value}</Text>
            <Text style={[styles.statsLabel, { color: theme.colors.subText }]}>{label}</Text>
        </View>
    );

    const SettingsRow = ({ icon, label, onPress, isSwitch, switchValue, onSwitch, subLabel }: any) => (
        <TouchableOpacity
            style={[styles.settingsRow, { backgroundColor: theme.colors.card }]}
            onPress={onPress}
            disabled={isSwitch}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                    <Ionicons name={icon} size={20} color={theme.colors.text} />
                </View>
                <View>
                    <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>{label}</Text>
                    {subLabel && <Text style={[styles.settingsSubLabel, { color: theme.colors.subText }]}>{subLabel}</Text>}
                </View>
            </View>
            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitch}
                    trackColor={{ false: "#767577", true: theme.colors.primary }}
                    thumbColor={isDark ? "#f4f3f4" : "#f4f3f4"}
                />
            ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.colors.subText} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Standard Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* User Info Section (Old Header) */}
            <View style={styles.userInfoSection}>
                <View>
                    <Text style={[styles.userName, { color: theme.colors.text }]}>Hi, {userInfo?.name || 'User'}</Text>
                    <Text style={[styles.userEmail, { color: theme.colors.subText }]}>{userInfo?.email}</Text>
                </View>
                <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>{userInfo?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statsContainer}>
                    <StatsCard label="Streaks" value={`${stats.streak} Days`} icon="flame" color="#F59E0B" />
                    <StatsCard label="Mastered" value={stats.cardsMastered} icon="checkmark-circle" color="#10B981" />
                    <StatsCard label="Sets" value={stats.totalSets} icon="albums" color="#3B82F6" />
                </View>

                <Text style={[styles.sectionHeader, { color: theme.colors.subText }]}>PREFERENCES</Text>
                <View style={styles.sectionContainer}>
                    <SettingsRow icon="moon" label="Dark Mode" isSwitch switchValue={isDark} onSwitch={toggleTheme} />
                    <SettingsRow
                        icon="notifications"
                        label="Daily Reminders"
                        subLabel={notificationsEnabled ? `On (${formatAMPM(reminderTime)})` : 'Disabled'}
                        isSwitch
                        switchValue={notificationsEnabled}
                        onSwitch={toggleReminder}
                    />
                </View>

                <Text style={[styles.sectionHeader, { color: theme.colors.subText }]}>ACCOUNT</Text>
                <View style={styles.sectionContainer}>
                    <SettingsRow icon="person" label="Edit Profile" onPress={openEditModal} />
                    <SettingsRow icon="lock-closed" label="Change Password" onPress={() => setPasswordModalVisible(true)} />
                    <SettingsRow icon="download" label="Export Data" onPress={handleExportData} />
                </View>

                <View style={styles.actionContainer}>
                    <TouchableOpacity style={[styles.actionButton, { borderColor: theme.colors.border }]} onPress={logout}>
                        <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Log Out</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { borderColor: theme.colors.danger, marginTop: 10 }]} onPress={handleDeleteAccount}>
                        <Text style={[styles.actionButtonText, { color: theme.colors.danger }]}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={editModalVisible} transparent animationType="slide">
                <View style={styles.modalCentered}>
                    <View style={[styles.modalView, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>

                        <Text style={[styles.inputLabel, { color: theme.colors.subText }]}>Full Name</Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                            value={editName}
                            onChangeText={setEditName}
                        />

                        <Text style={[styles.inputLabel, { color: theme.colors.subText }]}>Email Address</Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                            value={editEmail}
                            onChangeText={setEditEmail}
                            autoCapitalize="none"
                        />

                        <Text style={[styles.inputLabel, { color: theme.colors.subText }]}>Reminder Time</Text>
                        <TouchableOpacity
                            style={[styles.input, { borderColor: theme.colors.border, justifyContent: 'center' }]}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text style={{ color: theme.colors.text, fontSize: 16 }}>
                                {formatAMPM(editReminderTime)}
                            </Text>
                        </TouchableOpacity>

                        {showTimePicker && (
                            <DateTimePicker
                                value={(() => {
                                    const [h, m] = editReminderTime.split(':').map(Number);
                                    const d = new Date();
                                    d.setHours(h, m, 0, 0);
                                    return d;
                                })()}
                                mode="time"
                                is24Hour={false} // Force AM/PM preference
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleTimeChange}
                            />
                        )}

                        <View style={styles.modalBtns}>
                            <Button title="Cancel" onPress={() => setEditModalVisible(false)} color="#999" />
                            <Button title="Save Changes" onPress={handleUpdateProfile} color={theme.colors.primary} />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal visible={passwordModalVisible} transparent animationType="slide">
                <View style={styles.modalCentered}>
                    <View style={[styles.modalView, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Change Password</Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                            placeholder="Current Password"
                            placeholderTextColor={theme.colors.subText}
                            value={oldPassword}
                            onChangeText={setOldPassword}
                            secureTextEntry
                        />
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                            placeholder="New Password"
                            placeholderTextColor={theme.colors.subText}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" onPress={() => setPasswordModalVisible(false)} color="#999" />
                            <Button title="Update" onPress={handleChangePassword} color={theme.colors.primary} />
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    userInfoSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25 },
    userName: { fontSize: 24, fontWeight: 'bold' },
    userEmail: { fontSize: 14 },
    avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    scrollContent: { padding: 20 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    statsCard: { flex: 1, alignItems: 'center', padding: 15, borderRadius: 12, marginHorizontal: 5, elevation: 2 },
    statsValue: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
    statsLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' },
    sectionHeader: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, marginLeft: 5, marginTop: 10 },
    sectionContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
    settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    settingsLabel: { fontSize: 16, fontWeight: '500' },
    settingsSubLabel: { fontSize: 12 },
    iconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    actionContainer: { marginTop: 10 },
    actionButton: { padding: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    actionButtonText: { fontWeight: '600', fontSize: 16 },
    versionText: { textAlign: 'center', fontSize: 12 },
    // Modal
    modalCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { width: '85%', padding: 20, borderRadius: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    inputLabel: { fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
    modalBtns: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 }
});

export default ProfileScreen;
