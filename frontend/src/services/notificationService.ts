import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const notificationService = {
    // Request permissions for notifications
    requestPermissions: async () => {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get notification permission!');
            return false;
        }
        return true;
    },

    // Schedule a daily reminder notification
    scheduleDailyReminder: async (timeStr: string) => {
        // First cancel all existing notifications for reminders
        await Notifications.cancelAllScheduledNotificationsAsync();

        const [hours, minutes] = timeStr.split(':').map(Number);

        // Daily repeating notification
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Revision Time 📚",
                body: "Keep your streak alive! Open ReviseRight and master some new concepts.",
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
                hour: hours,
                minute: minutes,
                repeats: true,
            },
        });

        console.log(`Notification scheduled for ${hours}:${minutes} daily`);
    },

    // Cancel all scheduled notifications
    cancelAll: async () => {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('All scheduled notifications cancelled');
    },

    // Check and re-sync notifications (call on app start)
    checkAndResync: async () => {
        try {
            const enabled = await AsyncStorage.getItem('dailyReminderEnabled');
            const time = await AsyncStorage.getItem('dailyReminderTime') || "09:00";

            if (enabled === 'true') {
                const hasPermission = await notificationService.requestPermissions();
                if (hasPermission) {
                    await notificationService.scheduleDailyReminder(time);
                }
            } else {
                await notificationService.cancelAll();
            }
        } catch (e) {
            console.error('Notification resync error:', e);
        }
    }
};
