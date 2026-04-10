import React, { useState, useContext, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { flashcardService } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

type AIMode = 'simplify' | 'visualize' | 'raw';

interface CardItem {
    id: string;
    term: string;
    definition: string;
}

interface ModeOption {
    key: AIMode;
    label: string;
    icon: string;
    description: string;
    activeColor: string;
    activeBg: string;
}

const MODE_OPTIONS: ModeOption[] = [
    {
        key: 'simplify',
        label: 'Simplify',
        icon: '✦',
        description: 'AI condenses into bullet points',
        activeColor: '#7c3aed',
        activeBg: '#ede9fe',
    },
    {
        key: 'visualize',
        label: 'Visualize',
        icon: '◈',
        description: 'AI draws an ASCII diagram',
        activeColor: '#0284c7',
        activeBg: '#e0f2fe',
    },
    {
        key: 'raw',
        label: 'Keep Raw',
        icon: '◎',
        description: 'Save as-is, no AI processing',
        activeColor: '#059669',
        activeBg: '#d1fae5',
    },
];

const CreateFlashcardScreen = ({ navigation }: any) => {
    const { theme, isDark } = useContext(ThemeContext);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cards, setCards] = useState<CardItem[]>([{ id: '1', term: '', definition: '' }]);
    const [aiMode, setAiMode] = useState<AIMode>('raw');
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [editingSetId, setEditingSetId] = useState<string | null>(null);
    const route = useRoute<any>();

    useEffect(() => {
        if (route.params?.setId) {
            setEditingSetId(route.params.setId);
            setTitle(route.params.title || '');
            setDescription(route.params.description || '');

            if (route.params.existingCards && route.params.existingCards.length > 0) {
                // Ensure the formatting matches our local state expectation
                setCards(route.params.existingCards);
            }

            // Clear parameters so they don't persist if we navigate away and back
            navigation.setParams({ setId: undefined, title: undefined, description: undefined, existingCards: undefined });
        }
    }, [route.params]);

    /* ── Card CRUD ── */
    const addCard = () =>
        setCards(prev => [...prev, { id: Date.now().toString(), term: '', definition: '' }]);

    const updateCard = (id: string, field: 'term' | 'definition', value: string) =>
        setCards(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));

    const removeCard = (id: string) => {
        if (cards.length > 1) setCards(prev => prev.filter(c => c.id !== id));
    };

    /* ── Save ── */
    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title for the set.');
            return;
        }
        const validCards = cards.filter(c => c.term.trim() && c.definition.trim());
        if (validCards.length === 0) {
            Alert.alert('Error', 'Please add at least one complete card.');
            return;
        }

        const modeLabel = MODE_OPTIONS.find(m => m.key === aiMode)?.label ?? aiMode;

        setLoading(true);
        setLoadingMsg(
            aiMode === 'raw'
                ? 'Saving your flashcards…'
                : `Running ${modeLabel} on your set…`
        );

        try {
            const payload = {
                title,
                description,
                cards: validCards.map((c) => ({ 
                    id: c.id.length > 20 ? c.id : undefined, // Only send MongoDB IDs, not temp IDs
                    term: c.term, 
                    definition: c.definition 
                })),
                type: aiMode,
            };

            if (editingSetId) {
                await flashcardService.updateSet(editingSetId, payload);
            } else {
                await flashcardService.createSet(payload);
            }

            Alert.alert('✅ Done!', `Flashcard set ${editingSetId ? 'updated' : 'created'} successfully!`, [
                { text: 'OK', onPress: () => navigation.navigate('Home') },
            ]);

            setEditingSetId(null);
            setCards([{ id: '1', term: '', definition: '' }]);
            setTitle('');
            setDescription('');
        } catch (error: any) {
            console.error('[CreateFlashcardScreen] Save Error:', error);
            let errorMsg = 'Failed to save flashcard set.';
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMsg = 'Request timed out. The AI might be taking too long. Try saving as "Keep Raw" or reducing the number of cards.';
            } else if (error?.response?.data?.msg) {
                errorMsg = error.response.data.msg;
            } else if (!error.response) {
                errorMsg = 'Network error. Please check your internet connection or server status.';
            }
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
            setLoadingMsg('');
        }
    };

    const selectedMode = MODE_OPTIONS.find(m => m.key === aiMode)!;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={{ flex: 1 }}>

                {/* ── Top bar ── */}
                <View style={[styles.topBar, { borderBottomColor: theme.colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.topBarTitle, { color: theme.colors.text }]}>Create Set</Text>
                    <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* ── Set Info ── */}
                    <TextInput
                        style={[styles.subjectInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                        placeholder="Subject, chapter, unit"
                        placeholderTextColor={theme.colors.subText}
                        value={description}
                        onChangeText={setDescription}
                    />
                    <Text style={[styles.inputLabel, { color: theme.colors.subText }]}>TITLE</Text>
                    <TextInput
                        style={[styles.titleInput, { color: theme.colors.text }]}
                        placeholder="Title (e.g. React Hooks)"
                        placeholderTextColor={theme.colors.subText}
                        value={title}
                        onChangeText={setTitle}
                    />

                    {/* ── AI Mode Selector ── */}
                    <View style={[styles.modeSection, { backgroundColor: isDark ? '#1e1e2e' : '#f8f8ff', borderColor: theme.colors.border }]}>
                        <Text style={[styles.modeSectionTitle, { color: theme.colors.subText }]}>
                            ✦  AI Processing Mode
                        </Text>

                        <View style={styles.modeChips}>
                            {MODE_OPTIONS.map(opt => {
                                const active = aiMode === opt.key;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={[
                                            styles.chip,
                                            {
                                                backgroundColor: active ? opt.activeBg : (isDark ? '#2a2a3a' : '#f0f0f0'),
                                                borderColor: active ? opt.activeColor : 'transparent',
                                                borderWidth: active ? 2 : 1,
                                            },
                                        ]}
                                        onPress={() => setAiMode(opt.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.chipIcon, { color: active ? opt.activeColor : theme.colors.subText }]}>
                                            {opt.icon}
                                        </Text>
                                        <Text style={[styles.chipLabel, { color: active ? opt.activeColor : theme.colors.text }]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Description of selected mode */}
                        <View style={[styles.modeDesc, { backgroundColor: selectedMode.activeBg }]}>
                            <Text style={[styles.modeDescIcon, { color: selectedMode.activeColor }]}>
                                {selectedMode.icon}
                            </Text>
                            <Text style={[styles.modeDescText, { color: selectedMode.activeColor }]}>
                                {selectedMode.description}
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 20 }} />

                    {/* ── Cards ── */}
                    {cards.map((card, index) => (
                        <View
                            key={card.id}
                            style={[styles.cardBox, { backgroundColor: theme.colors.card }]}
                        >
                            <View style={styles.cardBoxHeader}>
                                <Text style={[styles.cardBoxIndex, { color: theme.colors.subText }]}>
                                    Card {index + 1}
                                </Text>
                                {cards.length > 1 && (
                                    <TouchableOpacity onPress={() => removeCard(card.id)}>
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <Text style={[styles.fieldLabel, { color: theme.colors.subText }]}>TERM</Text>
                            <TextInput
                                style={[styles.termInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                                placeholder="Enter term…"
                                placeholderTextColor={theme.colors.subText}
                                value={card.term}
                                onChangeText={text => updateCard(card.id, 'term', text)}
                            />

                            <Text style={[styles.fieldLabel, { color: theme.colors.subText, marginTop: 14 }]}>DEFINITION</Text>
                            <TextInput
                                style={[styles.defInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                                placeholder={
                                    aiMode === 'simplify'
                                        ? 'Paste your notes — AI will bullet-point them'
                                        : aiMode === 'visualize'
                                            ? 'Describe the concept — AI will draw a diagram'
                                            : 'Enter definition…'
                                }
                                placeholderTextColor={theme.colors.subText}
                                value={card.definition}
                                onChangeText={text => updateCard(card.id, 'definition', text)}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    ))}

                    {/* ── Add Card ── */}
                    <TouchableOpacity
                        style={[styles.addCardBtn, { borderColor: theme.colors.primary }]}
                        onPress={addCard}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                        <Text style={[styles.addCardBtnText, { color: theme.colors.primary }]}>Add Card</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>

                {/* ── Loading Overlay ── */}
                {loading && (
                    <View style={[styles.loadingOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.82)' : 'rgba(255,255,255,0.88)' }]}>
                        <View style={[styles.loadingCard, { backgroundColor: isDark ? '#1e1e2e' : '#fff' }]}>
                            <ActivityIndicator size="large" color={selectedMode.activeColor} style={{ marginBottom: 16 }} />
                            <Text style={[styles.loadingTitle, { color: selectedMode.activeColor }]}>
                                {selectedMode.icon}  {selectedMode.label}
                            </Text>
                            <Text style={[styles.loadingMsg, { color: theme.colors.subText }]}>{loadingMsg}</Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* Top bar */
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    topBarTitle: { fontSize: 18, fontWeight: '700' },
    saveBtn: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    /* Scroll */
    scrollContent: { padding: 20, paddingBottom: 60 },
    subjectInput: { fontSize: 14, marginBottom: 16, borderBottomWidth: 1, paddingBottom: 6 },
    inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    titleInput: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 24,
        borderBottomWidth: 2,
        borderBottomColor: '#4F46E5',
        paddingBottom: 8,
    },

    /* Mode selector */
    modeSection: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    modeSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    modeChips: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    chip: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        gap: 4,
    },
    chipIcon: { fontSize: 18, fontWeight: '700' },
    chipLabel: { fontSize: 12, fontWeight: '700' },
    modeDesc: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    modeDescIcon: { fontSize: 16 },
    modeDescText: { fontSize: 13, fontWeight: '500', flex: 1 },

    /* Card box */
    cardBox: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    cardBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    cardBoxIndex: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    termInput: { borderBottomWidth: 1, paddingVertical: 6, fontSize: 16, marginBottom: 4 },
    defInput: { borderBottomWidth: 1, paddingVertical: 6, fontSize: 15, minHeight: 80 },

    /* Add card */
    addCardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    addCardBtnText: { fontWeight: '700', fontSize: 15 },

    /* Loading overlay */
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99,
    },
    loadingCard: {
        width: 260,
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    loadingTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    loadingMsg: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

export default CreateFlashcardScreen;
