import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { authService } from '../services/api';

interface StreakData {
    streak: number;
    lastActiveDate: string | null;
    activeDays: string[];
    name: string;
}

// Returns the ISO date string (YYYY-MM-DD) for a given offset from today
const getDateStr = (offsetFromToday: number): string => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetFromToday);
    return d.toISOString().split('T')[0];
};

// Build the last 7 days ending today
const buildWeek = () => {
    return Array.from({ length: 7 }, (_, i) => {
        const offset = i - 6; // -6 … 0
        const iso = getDateStr(offset);
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const label = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1); // M T W T F S S
        return { iso, label, isToday: offset === 0 };
    });
};

const StreakBanner: React.FC = () => {
    const { theme, isDark } = useContext(ThemeContext);
    const [data, setData] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStreak();
    }, []);

    const fetchStreak = async () => {
        try {
            const res = await authService.getStreak();
            setData(res.data);
        } catch (err) {
            console.error('Streak fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const week = buildWeek();
    const activeDaySet = new Set(data?.activeDays ?? []);

    // Is streak alive today?
    const todayStr = getDateStr(0);
    const isActiveToday = activeDaySet.has(todayStr);

    // Fire color
    const fireColor = isActiveToday ? '#FF6B2B' : (isDark ? '#555' : '#ccc');
    const streakNum = data?.streak ?? 0;

    // Card colours
    const cardBg = isDark ? '#1e1e1e' : '#ffffff';
    const dotActive = '#FF6B2B';
    const dotToday = isDark ? '#333' : '#f0f0f0';
    const dotInactive = isDark ? '#2a2a2a' : '#f3f4f6';

    return (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
            {/* Top row: greeting + streak flame */}
            <View style={styles.topRow}>
                <View style={styles.greeting}>
                    <Text style={[styles.greetText, { color: theme.colors.subText }]}>
                        {data?.name ? `Hey, ${data.name.split(' ')[0]} 👋` : 'Welcome back 👋'}
                    </Text>
                    <Text style={[styles.subGreet, { color: theme.colors.subText }]}>
                        Keep the momentum going!
                    </Text>
                </View>

                {/* Flame + count */}
                <View style={styles.flameBox}>
                    {loading ? (
                        <ActivityIndicator size="small" color={fireColor} />
                    ) : (
                        <>
                            <Text style={[styles.flameIcon, { color: fireColor }]}>🔥</Text>
                            <Text style={[styles.streakCount, { color: theme.colors.text }]}>
                                {streakNum}
                            </Text>
                            <Text style={[styles.streakLabel, { color: theme.colors.subText }]}>
                                day{streakNum !== 1 ? 's' : ''}
                            </Text>
                        </>
                    )}
                </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />

            {/* Week dots */}
            <View style={styles.weekRow}>
                {week.map(({ iso, label, isToday }) => {
                    const active = activeDaySet.has(iso);
                    return (
                        <View key={iso} style={styles.dayCol}>
                            <Text style={[styles.dayLabel, {
                                color: isToday ? theme.colors.primary : theme.colors.subText,
                                fontWeight: isToday ? '700' : '400',
                            }]}>
                                {label}
                            </Text>
                            <View style={[
                                styles.dot,
                                {
                                    backgroundColor: active ? dotActive : (isToday ? dotToday : dotInactive),
                                    borderWidth: isToday ? 2 : 0,
                                    borderColor: isToday ? theme.colors.primary : 'transparent',
                                },
                            ]}>
                                {active && (
                                    <Text style={styles.dotFlame}>🔥</Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Bottom status message */}
            <View style={styles.statusRow}>
                <Ionicons
                    name={isActiveToday ? 'checkmark-circle' : 'time-outline'}
                    size={14}
                    color={isActiveToday ? '#22c55e' : theme.colors.subText}
                />
                <Text style={[styles.statusText, {
                    color: isActiveToday ? '#22c55e' : theme.colors.subText,
                }]}>
                    {isActiveToday
                        ? "You've studied today — streak safe! ✨"
                        : "Open a set today to keep your streak alive!"}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 20,
        padding: 18,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },

    // Top row
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    greeting: { flex: 1 },
    greetText: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    subGreet: { fontSize: 12 },

    // Flame box
    flameBox: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 64,
    },
    flameIcon: { fontSize: 28 },
    streakCount: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
    streakLabel: { fontSize: 11, marginTop: 1 },

    divider: { height: 1, marginBottom: 14 },

    // Week dots
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    dayCol: { alignItems: 'center', gap: 6 },
    dayLabel: { fontSize: 11 },
    dot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotFlame: { fontSize: 16 },

    // Status bar
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 12, flex: 1 },
});

export default StreakBanner;
