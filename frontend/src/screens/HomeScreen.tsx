import React, { useContext, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, ScrollView, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { flashcardService, authService } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../types';
import StreakBanner from '../components/StreakBanner';

type Props = BottomTabScreenProps<AppTabParamList, 'Home'>;

const HomeScreens = ({ navigation }: Props) => {
    const { theme, toggleTheme, isDark } = useContext(ThemeContext);

    const [flashcardSets, setFlashcardSets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Set detail modal
    const [selectedSet, setSelectedSet] = useState<any>(null);
    const [setDetailsModalVisible, setSetDetailsModalVisible] = useState(false);
    const [setCards, setSetCards] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Card detail modal
    const [cardDetailVisible, setCardDetailVisible] = useState(false);
    const [selectedCard, setSelectedCard] = useState<any>(null);

    // ─── Data fetching ─────────────────────────────────────────────
    const fetchSets = async () => {
        setLoading(true);
        try {
            const res = await flashcardService.getAllSets();
            setFlashcardSets(res.data);
        } catch (err) {
            console.error('Error fetching sets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchSets);
        return unsubscribe;
    }, [navigation]);

    const handleSetPress = async (set: any) => {
        setSelectedSet(set);
        setSetDetailsModalVisible(true);
        setLoadingDetails(true);
        // Ping streak so opening a set counts as daily activity
        authService.getStreak().catch(() => { });
        try {
            const res = await flashcardService.getSetDetails(set._id);
            setSetCards(res.data.cards);
        } catch (err) {
            console.error('Error fetching set details:', err);
            Alert.alert('Error', 'Could not load cards for this set.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleCardPress = (card: any) => {
        setSelectedCard(card);
        setCardDetailVisible(true);
    };

    const closeSetModal = () => {
        setSetDetailsModalVisible(false);
        setSelectedSet(null);
        setSetCards([]);
    };

    const handlePractice = () => {
        setSetDetailsModalVisible(false);
        if (selectedSet) {
            navigation.navigate('Revision', { setId: selectedSet._id } as any);
        }
    };

    // ─── Delete set ────────────────────────────────────────────────
    const handleDeleteSet = () => {
        Alert.alert(
            'Delete Set',
            `Delete "${selectedSet?.title}" and all its cards? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await flashcardService.deleteSet(selectedSet._id);
                            console.log('[deleteSet] Response:', res.status, res.data);
                            closeSetModal();
                            fetchSets();
                        } catch (err: any) {
                            const msg = err?.response?.data?.msg || err?.message || 'Unknown error';
                            const status = err?.response?.status;
                            console.error(`[deleteSet] FAILED. Status=${status} Msg=${msg}`);
                            Alert.alert('Error', `Could not delete (${status}): ${msg}`);
                        }
                    },
                },
            ]
        );
    };

    // ─── Delete card ───────────────────────────────────────────────
    const handleDeleteCard = (card: any) => {
        Alert.alert(
            'Delete Card',
            `Delete "${card.front}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await flashcardService.deleteCard(selectedSet._id, card._id);
                            console.log('[deleteCard] Response:', res.status, res.data);
                            setSetCards(prev => prev.filter((c: any) => c._id !== card._id));
                            fetchSets();
                        } catch (err: any) {
                            const msg = err?.response?.data?.msg || err?.message || 'Unknown error';
                            const status = err?.response?.status;
                            console.error(`[deleteCard] FAILED. Status=${status} Msg=${msg}`);
                            Alert.alert('Error', `Could not delete card (${status}): ${msg}`);
                        }
                    },
                },
            ]
        );
    };

    // ─── Add card ──────────────────────────────────────────────────
    const openAddCard = () => {
        if (!selectedSet) return;

        // Close the current detail modal
        setSetDetailsModalVisible(false);

        // Map existing cards to the format expected by Create screen
        const mappedCards = setCards.map(c => ({
            id: c._id, // Use existing ID to help with mapping if needed
            term: c.front,
            definition: c.back
        }));

        // Navigate to 'Create' tab with parameters
        // @ts-ignore
        navigation.navigate('Create', {
            setId: selectedSet._id,
            title: selectedSet.title,
            description: selectedSet.description,
            existingCards: mappedCards
        });
    };

    const handleAddCard = async () => {
        // Redirection logic is now in openAddCard
    };

    // ─── Render helpers ────────────────────────────────────────────
    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.hCard} onPress={() => handleSetPress(item)} activeOpacity={0.85}>
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                {/* Top: title + badge */}
                <View>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                    {item.cardCount !== undefined && (
                        <View style={[styles.badge, { backgroundColor: isDark ? '#2c2c3e' : '#EEF2FF', alignSelf: 'flex-start', marginTop: 6 }]}>
                            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{item.cardCount} cards</Text>
                        </View>
                    )}
                    {item.description ? (
                        <Text style={[styles.cardContent, { color: theme.colors.subText }]} numberOfLines={3}>
                            {item.description}
                        </Text>
                    ) : null}
                </View>
                {/* Bottom: date + arrow */}
                <View style={styles.cardFooter}>
                    <Text style={styles.createdDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    <Text style={styles.arrow}>→</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    // ─── Set detail modal ──────────────────────────────────────────
    const renderSetDetailModal = () => (
        <Modal
            animationType="slide" transparent
            visible={setDetailsModalVisible}
            onRequestClose={closeSetModal}
        >
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { backgroundColor: theme.colors.card, maxHeight: '92%' }]}>
                    {selectedSet && (
                        <>
                            {/* Header row */}
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                                    {selectedSet.title}
                                </Text>
                                {/* Trash icon — delete entire set */}
                                <TouchableOpacity
                                    onPress={handleDeleteSet}
                                    style={styles.iconBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={closeSetModal} style={[styles.iconBtn, { marginLeft: 4 }]}>
                                    <Ionicons name="close" size={22} color={theme.colors.subText} />
                                </TouchableOpacity>
                            </View>

                            {selectedSet.description ? (
                                <Text style={[styles.modalSubtitle, { color: theme.colors.subText }]}>
                                    {selectedSet.description}
                                </Text>
                            ) : null}

                            {/* Section header: card count + Add Card button */}
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.subText }]}>
                                    {setCards.length} {setCards.length === 1 ? 'Card' : 'Cards'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.addCardBtn, { backgroundColor: theme.colors.primary }]}
                                    onPress={openAddCard}
                                >
                                    <Ionicons name="add" size={16} color="#fff" />
                                    <Text style={styles.addCardBtnText}>Add Card</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

                            {loadingDetails ? (
                                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 20 }} />
                            ) : (
                                <FlatList
                                    data={setCards}
                                    keyExtractor={(item) => item._id}
                                    renderItem={({ item, index }) => (
                                        <View style={[styles.miniCard, { backgroundColor: isDark ? '#2a2a2a' : '#F9FAFB', borderColor: theme.colors.border }]}>
                                            {/* Tap left area to view card detail */}
                                            <TouchableOpacity
                                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                                                onPress={() => handleCardPress(item)}
                                            >
                                                <Text style={[styles.miniCardIndex, { marginRight: 10 }]}>{index + 1}</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.miniCardTerm, { color: theme.colors.text }]} numberOfLines={1}>
                                                        {item.front}
                                                    </Text>
                                                    <Text style={[styles.miniCardDef, { color: theme.colors.subText }]} numberOfLines={1}>
                                                        {item.back}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                            {/* Trash icon — delete this card */}
                                            <TouchableOpacity
                                                onPress={() => handleDeleteCard(item)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                style={styles.deleteCardBtn}
                                            >
                                                <Ionicons name="trash-outline" size={17} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 12 }}
                                    ListEmptyComponent={
                                        <Text style={[styles.emptyCardText, { color: theme.colors.subText }]}>
                                            No cards yet. Tap "Add Card" to get started!
                                        </Text>
                                    }
                                />
                            )}

                            {/* Footer */}
                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={[styles.closeButton, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}
                                    onPress={closeSetModal}
                                >
                                    <Text style={[styles.closeButtonLabel, { color: theme.colors.text }]}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.practiceButton, {
                                        backgroundColor: theme.colors.primary,
                                        opacity: setCards.length === 0 ? 0.4 : 1,
                                    }]}
                                    onPress={handlePractice}
                                    disabled={setCards.length === 0}
                                >
                                    <Text style={styles.practiceButtonText}>Practice Set</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );

    // ─── Card detail modal ─────────────────────────────────────────
    const renderCardDetailModal = () => (
        <Modal
            animationType="fade" transparent
            visible={cardDetailVisible}
            onRequestClose={() => setCardDetailVisible(false)}
        >
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { backgroundColor: theme.colors.card }]}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        {selectedCard && (
                            <>
                                <Text style={styles.label}>TERM / CONCEPT</Text>
                                <Text style={[styles.detailTerm, { color: theme.colors.text }]}>{selectedCard.front}</Text>
                                <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                                <Text style={styles.label}>DEFINITION / EXPLANATION</Text>
                                <Text style={[styles.detailDef, { color: theme.colors.text }]}>{selectedCard.back}</Text>
                            </>
                        )}
                    </ScrollView>
                    <TouchableOpacity
                        style={[styles.closeButton, { width: '100%', marginTop: 10, backgroundColor: isDark ? '#333' : '#F3F4F6' }]}
                        onPress={() => setCardDetailVisible(false)}
                    >
                        <Text style={[styles.closeButtonLabel, { color: theme.colors.text }]}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );



    // ─── Main render ───────────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Your Library</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity onPress={fetchSets} disabled={loading}>
                        <Ionicons
                            name={loading ? 'hourglass-outline' : 'refresh-outline'}
                            size={22}
                            color={theme.colors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleTheme}>
                        <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <StreakBanner />

            {/* Section label */}
            <View style={styles.sectionLabelRow}>
                <Text style={[styles.sectionLabelText, { color: theme.colors.text }]}>Your Sets</Text>
                <Text style={[styles.sectionLabelCount, { color: theme.colors.subText }]}>
                    {flashcardSets.length} {flashcardSets.length === 1 ? 'set' : 'sets'}
                </Text>
            </View>

            <FlatList
                data={flashcardSets}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: theme.colors.text }]}>No flashcard sets found.</Text>
                        <Text style={styles.emptySubText}>Create your first set to get started!</Text>
                    </View>
                }
            />

            {renderSetDetailModal()}
            {renderCardDetailModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    list: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'flex-start' },
    sectionLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 15,
        marginBottom: 5
    },
    sectionLabelText: { fontSize: 20, fontWeight: 'bold' },
    sectionLabelCount: { fontSize: 13, fontWeight: '500' },

    // Horizontal card
    hCard: { width: 160, marginRight: 14 },
    card: {
        padding: 14, borderRadius: 16,
        elevation: 4, shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 5,
        height: 180, justifyContent: 'space-between',
    },
    cardHeader: {},
    cardTitle: { fontSize: 15, fontWeight: 'bold', lineHeight: 20 },
    cardContent: { fontSize: 12, marginTop: 8, lineHeight: 17 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    createdDate: { fontSize: 10, color: '#9CA3AF' },
    arrow: { fontSize: 16, color: '#D1D5DB' },

    emptyState: { alignItems: 'center', marginTop: 50, padding: 20 },
    emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    emptySubText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
    emptyCardText: { textAlign: 'center', marginVertical: 20, fontSize: 14 },

    // Modal shell
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: {
        width: '92%', borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalSubtitle: { fontSize: 14, marginBottom: 10 },
    modalContent: { paddingBottom: 20 },
    modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    iconBtn: { padding: 4 },

    // Section header (cards count + Add Card btn)
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8 },
    sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    addCardBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addCardBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Mini card rows in set detail
    miniCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1,
    },
    miniCardIndex: { fontWeight: 'bold', color: '#9CA3AF' },
    miniCardTerm: { fontWeight: '600', marginBottom: 2 },
    miniCardDef: { fontSize: 12 },
    deleteCardBtn: { padding: 6, marginLeft: 8 },

    separator: { height: 1, marginVertical: 12 },

    practiceButton: { flex: 1, marginLeft: 10, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    practiceButtonText: { color: '#fff', fontWeight: 'bold' },
    closeButton: { flex: 1, marginRight: 10, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    closeButtonLabel: { fontWeight: '600' },

    // Card detail modal
    detailTerm: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
    detailDef: { fontSize: 16, lineHeight: 24, textAlign: 'left' },
    label: { fontSize: 14, color: '#6B7280', marginTop: 10, marginBottom: 5, fontWeight: 'bold', textTransform: 'uppercase' },

    // Add-card form inputs
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
    textInputMulti: { minHeight: 80 },
});

export default HomeScreens;
