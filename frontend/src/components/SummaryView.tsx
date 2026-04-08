import React, { useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface SummaryViewProps {
    stats: {
        mastered: number;
        learning: number;
        total: number;
    };
    onRestart: () => void;
    onBack: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ stats, onRestart, onBack }) => {
    const { theme, isDark } = useContext(ThemeContext);

    const remaining = stats.total - stats.mastered - stats.learning;

    // Circle ring dimensions
    const circleSize = 100;
    const strokeWidth = 8;
    const radius = (circleSize - strokeWidth) / 2;
    const cx = circleSize / 2;
    const cy = circleSize / 2;

    return (
        <View style={[styles.outerContainer, { backgroundColor: isDark ? '#1a1a2e' : '#f0f2f5' }]}>

            {/* ── Header ── */}
            <View style={styles.headerRow}>
                <Text style={[styles.headerText, { color: theme.colors.text }]}>
                    Wow, you know your{'\n'}stuff! Try Learn for extra{'\n'}practice.
                </Text>

                {/* Graduation cap emoji illustration */}
                <View style={styles.illustrationBox}>
                    <Text style={styles.capEmoji}>🎓</Text>
                    <View style={styles.confettiRow}>
                        <Text style={styles.confettiDot}>🎊</Text>
                        <Text style={styles.confettiDot}>✨</Text>
                    </View>
                </View>
            </View>

            {/* ── Progress Section ── */}
            <Text style={[styles.sectionLabel, { color: '#4f86f7' }]}>Your progress</Text>

            <View style={styles.progressRow}>

                {/* Green circle with checkmark */}
                <View style={styles.circleWrapper}>
                    <Svg width={circleSize} height={circleSize}>
                        {/* Background ring */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            strokeWidth={strokeWidth}
                            stroke={isDark ? '#2a3a2a' : '#d4f4e2'}
                            fill="none"
                        />
                        {/* Green progress ring */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            strokeWidth={strokeWidth}
                            stroke="#26aa5dff"
                            fill="none"
                            strokeLinecap="round"
                        />
                        {/* Checkmark via Polyline */}
                        <Polyline
                            points={`${cx - 18},${cy} ${cx - 6},${cy + 13} ${cx + 18},${cy - 13}`}
                            stroke="#33c871ff"
                            strokeWidth={6}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </View>

                {/* Stat pills */}
                <View style={styles.statsColumn}>
                    <StatRow label="Know" value={stats.mastered} bg="#d4f4e2" textColor="#154a2ae3" />
                    <StatRow label="Still learning" value={stats.learning} bg="#fde8d4" textColor="#6b3c22ff" />
                    <StatRow label="Terms remaining" value={remaining < 0 ? 0 : remaining} bg={isDark ? '#2c2c2c' : '#e8e8e8'} textColor={isDark ? '#aaa' : '#555'} />
                </View>
            </View>

            {/* ── Back link ── */}
            <TouchableOpacity onPress={onBack} style={styles.backLink}>
                <Text style={styles.backLinkText}>Back to the last question</Text>
            </TouchableOpacity>

            {/* ── Spacer pushes buttons to bottom ── */}
            <View style={{ flex: 1 }} />

            {/* ── Buttons ── */}
            <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.primaryBtn} onPress={onRestart}>
                    <Text style={styles.primaryBtnIcon}>↺  </Text>
                    <Text style={styles.primaryBtnText}>Practise in Learn</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onRestart} style={styles.restartLink}>
                    <Text style={[styles.restartLinkText, { color: theme.colors.subText }]}>Restart Flashcards</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};

/** Coloured pill row */
const StatRow = ({
    label,
    value,
    bg,
    textColor,
}: {
    label: string;
    value: number;
    bg: string;
    textColor: string;
}) => (
    <View style={[styles.statPill, { backgroundColor: bg }]}>
        <Text style={[styles.statPillLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.statPillValue, { color: textColor }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 20,
        width: '100%',
        height: '100%',
    },

    /* Header */
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 30,
        flex: 1,
        paddingRight: 12,
    },
    illustrationBox: {
        alignItems: 'center',
    },
    capEmoji: {
        fontSize: 52,
    },
    confettiRow: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 4,
    },
    confettiDot: {
        fontSize: 18,
    },

    /* Section label */
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        letterSpacing: 0.3,
    },

    /* Progress row */
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
        gap: 20,
    },
    circleWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* Stat pills */
    statsColumn: {
        flex: 1,
        gap: 10,
    },
    statPill: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 9,
        paddingHorizontal: 16,
    },
    statPillLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    statPillValue: {
        fontSize: 14,
        fontWeight: '800',
    },

    /* Back link */
    backLink: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    backLinkText: {
        color: '#4f86f7',
        fontSize: 15,
        fontWeight: '600',
    },

    /* Bottom buttons */
    bottomButtons: {
        gap: 14,
        paddingBottom: 10,
    },
    primaryBtn: {
        flexDirection: 'row',
        backgroundColor: '#4f46e5',
        borderRadius: 50,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    primaryBtnIcon: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    restartLink: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    restartLinkText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default SummaryView;
