import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { flashcardService } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ExportData'>;

const ExportDataScreen = ({ navigation }: Props) => {
    const { theme, isDark } = useContext(ThemeContext);
    const [loading, setLoading] = useState(true);
    const [sets, setSets] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await flashcardService.getAllSets();
            setSets(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            // Format the data into a readable string
            let shareText = "My ReviseRight Flashcards\n\n";

            sets.forEach((set, index) => {
                shareText += `📦 Set: ${set.title}\n`;
                if (set.description) shareText += `   Description: ${set.description}\n`;
                shareText += '-----------------------------\n';

                if (set.flashcards && set.flashcards.length > 0) {
                    set.flashcards.forEach((card: any) => {
                        // Clean up newlines in card text for better formatting
                        const front = card.front.replace(/\n/g, ' ');
                        const back = card.back.replace(/\n/g, ' ');
                        shareText += `Q: ${front}\nA: ${back}\n\n`;
                    });
                } else {
                    shareText += "(No cards in this set)\n\n";
                }
                shareText += "=============================\n\n";
            });

            await Share.share({
                message: shareText,
                title: "ReviseRight Export"
            });
        } catch (error) {
            console.error(error);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.cardHeader}>
                <Ionicons name="albums" size={24} color={theme.colors.primary} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.title}</Text>
                    <Text style={[styles.cardSub, { color: theme.colors.subText }]}>{item.amount || item.flashcards?.length || 0} Cards</Text>
                </View>
            </View>
            <View style={styles.divider} />
            {item.flashcards && item.flashcards.slice(0, 3).map((card: any, index: number) => (
                <View key={index} style={styles.previewRow}>
                    <Text style={[styles.previewText, { color: theme.colors.subText }]} numberOfLines={1}>• {card.front}</Text>
                </View>
            ))}
            {item.flashcards && item.flashcards.length > 3 && (
                <Text style={[styles.moreText, { color: theme.colors.subText }]}>+ {item.flashcards.length - 3} more...</Text>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Export Data Preview</Text>
                <TouchableOpacity onPress={handleShare}>
                    <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={sets}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.colors.subText, marginTop: 20 }}>No sets found.</Text>}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    listContent: { padding: 20 },
    card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    cardSub: { fontSize: 12 },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 10 },
    previewRow: { marginBottom: 4 },
    previewText: { fontSize: 12 },
    moreText: { fontSize: 12, marginTop: 5, fontStyle: 'italic' }
});

export default ExportDataScreen;
