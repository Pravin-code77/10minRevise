import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { flashcardService } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, interpolateColor } from 'react-native-reanimated';
import SummaryView from '../components/SummaryView';
import { ThemeContext } from '../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 150;

const RevisionScreen = ({ route }: any) => {
    const { theme, isDark } = useContext(ThemeContext);
    const { setId } = route.params || {};
    const [cards, setCards] = useState<any[]>([]);
    const [results, setResults] = useState<{ id: string; status: 'mastered' | 'learning' }[]>([]);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(false);

    const translateY = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    const fetchCards = async () => {
        setLoading(true);
        setResults([]);
        try {
            let res;
            if (setId) {
                console.log(`[Revise] Fetching set: ${setId}`);
                res = await flashcardService.getSetDetails(setId);
                setCards(res.data.cards);
            } else {
                console.log('[Revise] Fetching due cards');
                res = await flashcardService.getDue();
                setCards(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCards();
    }, [setId]);

    const handleSwipeComplete = async (direction: 'up' | 'down') => {
        const currentIndex = results.length;
        if (currentIndex >= cards.length) {
            console.log('[Revise] All cards done');
            return;
        }

        const card = cards[currentIndex];
        const status = direction === 'up' ? 'mastered' : 'learning';
        console.log(`[Revise] Swiping ${direction} (Status: ${status}) for Card: ${card._id}`);

        // Update Backend
        try {
            await flashcardService.updateStatus(card._id, status);
            console.log('[Revise] API update success');

            // Update Local State
            setResults(prev => {
                const newRes = [...prev, { id: card._id, status: status as 'mastered' | 'learning' }];
                console.log(`[Revise] Results updated. Count: ${newRes.length}`);
                return newRes;
            });

            // Reset UI for next card
            setIsFlipped(false);
            translateY.value = 0;
        } catch (error: any) {
            console.error('[Revise] Swipe Error:', error);
            if (error.response) {
                console.error('[Revise] Server Error Data:', JSON.stringify(error.response.data, null, 2));
            }
            translateY.value = withSpring(0);
        }
    };

    const handleBack = () => {
        if (results.length > 0) {
            setResults(prev => prev.slice(0, -1));
            setIsFlipped(false);
        }
    };

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = event.translationY + context.value.y;
        })
        .onEnd(() => {
            if (translateY.value < -SWIPE_THRESHOLD) {
                // Swiped Up
                runOnJS(handleSwipeComplete)('up');
            } else if (translateY.value > SWIPE_THRESHOLD) {
                // Swiped Down
                runOnJS(handleSwipeComplete)('down');
            } else {
                // Return to center
                translateY.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        // Clamp the translateY to [-SWIPE_THRESHOLD, SWIPE_THRESHOLD] for color interpolation
        const clampedY = Math.max(-SWIPE_THRESHOLD, Math.min(SWIPE_THRESHOLD, translateY.value));

        // borderColor: green when swiping up (negative Y), red when swiping down (positive Y), transparent at 0
        const borderColor = clampedY < 0
            ? interpolateColor(
                clampedY,
                [-SWIPE_THRESHOLD, 0],
                ['#22c55e', 'transparent']
            )
            : interpolateColor(
                clampedY,
                [0, SWIPE_THRESHOLD],
                ['transparent', '#ef4444']
            );

        const borderWidth = clampedY !== 0 ? Math.min(4, Math.abs(clampedY) / 20) : 0;

        return {
            transform: [{ translateY: translateY.value }],
            borderColor,
            borderWidth,
        };
    });

    const currentIndex = results.length;

    if (loading) {
        return (
            <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.text }}>Loading Due Cards...</Text>
            </SafeAreaView>
        );
    }

    // Summary View
    if (currentIndex >= cards.length && cards.length > 0) {
        const stats = {
            mastered: results.filter(r => r.status === 'mastered').length,
            learning: results.filter(r => r.status === 'learning').length,
            total: cards.length
        };

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <SummaryView
                    stats={stats}
                    onRestart={fetchCards}
                    onBack={handleBack}
                />
            </SafeAreaView>
        );
    }

    if (cards.length === 0) {
        return (
            <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.text }}>No cards due for revision!</Text>
                <Text style={styles.subText} onPress={fetchCards}>Tap to refresh</Text>
            </SafeAreaView>
        );
    }

    const currentCard = cards[currentIndex];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={styles.progress}>Card {currentIndex + 1} of {cards.length}</Text>
            <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>Swipe UP if you Know it</Text>
                <Text style={styles.instructionText}>Swipe DOWN if you're Still Learning</Text>
            </View>

            <GestureDetector gesture={gesture}>
                <Animated.View style={[styles.card, animatedStyle, { backgroundColor: theme.colors.card }]}>
                    <TouchableOpacity
                        style={styles.cardContent}
                        activeOpacity={1}
                        onPress={() => setIsFlipped(!isFlipped)}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {!isFlipped ? (
                                <View style={styles.faceContainer}>
                                    <Text style={styles.label}>FRONT</Text>
                                    <Text style={[styles.cardText, { color: theme.colors.text }]}>{currentCard.front}</Text>
                                    <Text style={styles.hint}>(Tap to Flip)</Text>
                                </View>
                            ) : (
                                <View style={styles.faceContainer}>
                                    <Text style={styles.label}>BACK ({currentCard.type || 'raw'})</Text>
                                    <Text style={[
                                        styles.cardText2,
                                        { color: theme.colors.text },
                                        currentCard.type === 'visualize' && {
                                            fontFamily: 'monospace',
                                            fontSize: 11,
                                            textAlign: 'left',
                                            lineHeight: 16
                                        }
                                    ]}>
                                        {currentCard.back}
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </TouchableOpacity>
                </Animated.View>
            </GestureDetector>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', paddingTop: 20 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    progress: { marginBottom: 10, color: '#666', fontSize: 16 },
    instructionContainer: { marginBottom: 20, alignItems: 'center' },
    instructionText: { color: '#999', fontSize: 12 },
    subText: { marginTop: 10, color: '#3b82f6' },
    card: {
        width: SCREEN_WIDTH - 40,
        height: 450,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
    },
    cardContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    faceContainer: {
        alignItems: 'flex-start', // Use flex-start to prevent centering lines of ASCII diagrams
        width: '100%',
    },
    label: {
        fontSize: 10,
        color: '#999',
        marginBottom: 20,
        letterSpacing: 1,
        textTransform: 'uppercase',
        alignSelf: 'center' // Keep label centered
    },
    cardText: { fontSize: 22, textAlign: 'center', fontWeight: '500', alignSelf: 'center' },
    cardText2: { fontSize: 16, textAlign: 'left', fontWeight: '400' },
    hint: { marginTop: 40, color: '#ccc', fontStyle: 'italic', alignSelf: 'center' },
});

export default RevisionScreen;
