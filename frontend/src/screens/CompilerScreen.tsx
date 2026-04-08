import React, { useState, useContext, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { compilerService } from '../services/api';
import { ThemeContext } from '../context/ThemeContext';

type Language = 'javascript' | 'python' | 'java' | 'c' | 'cpp';

interface LangConfig {
    label: string;
    color: string;
    placeholder: string;
}

const LANGUAGES: Record<Language, LangConfig> = {
    javascript: {
        label: 'JavaScript',
        color: '#f7df1e',
        placeholder: 'console.log("Hello, World!");',
    },
    python: {
        label: 'Python',
        color: '#3572a5',
        placeholder: 'print("Hello, World!")',
    },
    java: {
        label: 'Java',
        color: '#b07219',
        placeholder: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    },
    c: {
        label: 'C',
        color: '#555555',
        placeholder: '#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    },
    cpp: {
        label: 'C++',
        color: '#f34b7d',
        placeholder: '#include <iostream>\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
    },
};

// Auto-close map: opener → closer
const AUTO_CLOSE: Record<string, string> = {
    '{': '}',
    '(': ')',
    '[': ']',
    '"': '"',
    "'": "'",
};
// Set of closing chars (for skip-over detection)
const CLOSING_CHARS = new Set(['}', ')', ']', '"', "'"]);

// ─────────────────────────────────────────────────────────────────
// Diff helper: find what was inserted/deleted between two strings
// ─────────────────────────────────────────────────────────────────
function diffStrings(oldStr: string, newStr: string) {
    let p = 0;
    while (p < oldStr.length && p < newStr.length && oldStr[p] === newStr[p]) p++;

    let oldEnd = oldStr.length;
    let newEnd = newStr.length;
    while (oldEnd > p && newEnd > p && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }

    return {
        insertPos: p,               // where the change starts in oldStr
        deleted: oldStr.slice(p, oldEnd),
        inserted: newStr.slice(p, newEnd),
    };
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
const CompilerScreen = () => {
    const { theme, isDark } = useContext(ThemeContext);
    const [language, setLanguage] = useState<Language>('javascript');
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    // Controlled selection for programmatic cursor positioning
    const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);

    // We keep the "real" code in a ref so handleChangeText can compare without stale closure
    const codeRef = useRef('');

    // Flag: are we doing a programmatic cursor move right now?
    const programmaticMove = useRef(false);

    // ── Programmatic cursor position ───────────────────────────────
    const setCursorAt = (pos: number) => {
        programmaticMove.current = true;
        setSelection({ start: pos, end: pos });
        // Release after one event cycle so user can move cursor freely afterwards
        setTimeout(() => {
            programmaticMove.current = false;
            setSelection(undefined);
        }, 50);
    };

    // ── Main onChange handler (all smart editing logic lives here) ──
    const handleChangeText = useCallback((newText: string) => {
        const oldText = codeRef.current;
        const { insertPos, deleted, inserted } = diffStrings(oldText, newText);

        // ── Pure deletion ─────────────────────────────────────────
        if (inserted === '') {
            codeRef.current = newText;
            setCode(newText);
            return;
        }

        // ── Newline inserted (Enter key on Android) ───────────────
        if (inserted === '\n' && deleted === '') {
            const before = oldText.slice(0, insertPos);
            const after = oldText.slice(insertPos);

            // Find indentation of current line
            const lineStart = before.lastIndexOf('\n') + 1; // +1 to skip past the \n itself
            const currentLine = before.slice(lineStart);
            const baseIndent = currentLine.match(/^(\s*)/)?.[1] ?? '';

            const lastChar = before.trimEnd().slice(-1);
            const opensBlock = ['{', '(', '['].includes(lastChar);

            if (opensBlock) {
                const closingChar = AUTO_CLOSE[lastChar];
                const nextIsClose = after.trimStart()[0] === closingChar;
                const innerIndent = baseIndent + '    ';

                let finalCode: string;
                let newCursor: number;

                if (nextIsClose) {
                    // {|} → {\n    |\n}
                    finalCode = before + '\n' + innerIndent + '\n' + baseIndent + after;
                    newCursor = before.length + 1 + innerIndent.length;
                } else {
                    finalCode = before + '\n' + innerIndent + after;
                    newCursor = before.length + 1 + innerIndent.length;
                }

                codeRef.current = finalCode;
                setCode(finalCode);
                setCursorAt(newCursor);
            } else {
                // Normal Enter: preserve current line's indentation
                const finalCode = before + '\n' + baseIndent + after;
                codeRef.current = finalCode;
                setCode(finalCode);
                if (baseIndent) {
                    // Only override cursor when we added indentation chars
                    // (i.e., cursor must sit AFTER the indent spaces, not before them)
                    const newCursor = before.length + 1 + baseIndent.length;
                    setCursorAt(newCursor);
                }
                // If no indentation, Android's natural cursor at before.length+1 is correct —
                // don't call setCursorAt, which would fight Android and cause a 2-line jump.
            }
            return;
        }

        // ── Single character insertion ─────────────────────────────
        if (inserted.length === 1 && deleted === '') {
            const char = inserted;
            const before = oldText.slice(0, insertPos);
            const after = oldText.slice(insertPos);   // text AFTER the insert point (in old text)

            // Skip-over: user typed a closing char that's already next in the string
            if (CLOSING_CHARS.has(char) && oldText[insertPos] === char) {
                // Undo the insertion Android already did, advance cursor instead
                codeRef.current = oldText;
                setCode(oldText);
                setCursorAt(insertPos + 1);
                return;
            }

            // Auto-close: insert opener → add closer, place cursor inside
            if (AUTO_CLOSE[char]) {
                const closing = AUTO_CLOSE[char];
                // Avoid double-closing (e.g. user already has closing there)
                if (after[0] !== closing) {
                    // newText already has char inserted by Android; we just append closer
                    const finalCode = before + char + closing + after;
                    const newCursor = insertPos + 1;   // inside the pair
                    codeRef.current = finalCode;
                    setCode(finalCode);
                    setCursorAt(newCursor);
                    return;
                }
            }
        }

        // ── Default: accept Android's text as-is ─────────────────
        codeRef.current = newText;
        setCode(newText);
    }, []);

    // ── Code runner ────────────────────────────────────────────────
    const runCode = async () => {
        if (!code.trim()) return;
        setLoading(true);
        setOutput('');
        setIsError(false);
        try {
            const res = await compilerService.run({ language, code });
            const data = res.data;
            const stdout = data.stdout?.trim();
            const stderr = data.stderr?.trim();
            if (stderr) {
                setOutput(stderr);
                setIsError(true);
            } else {
                setOutput(stdout || '(no output)');
                setIsError(false);
            }
        } catch (err: any) {
            setOutput(err?.response?.data?.msg || err.message || 'Network error');
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const clearAll = () => {
        codeRef.current = '';
        setCode('');
        setOutput('');
        setIsError(false);
    };

    const langKeys = Object.keys(LANGUAGES) as Language[];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* ── Header ── */}
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="code-slash" size={22} color={theme.colors.primary} />
                        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                            Code Runner
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={clearAll} style={styles.iconBtn}>
                            <Ionicons name="trash-outline" size={20} color={theme.colors.subText} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.runBtn, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
                            onPress={runCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="play" size={14} color="#fff" />
                                    <Text style={styles.runBtnText}>Run</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Language Tabs ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.langBar, { borderBottomColor: theme.colors.border }]}
                    contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                >
                    {langKeys.map(lang => {
                        const active = lang === language;
                        const cfg = LANGUAGES[lang];
                        return (
                            <TouchableOpacity
                                key={lang}
                                style={[
                                    styles.langChip,
                                    {
                                        backgroundColor: active ? cfg.color + '28' : 'transparent',
                                        borderColor: active ? cfg.color : 'transparent',
                                        borderWidth: active ? 1.5 : 1,
                                    },
                                ]}
                                onPress={() => setLanguage(lang)}
                            >
                                <View style={[styles.langDot, { backgroundColor: cfg.color }]} />
                                <Text
                                    style={[
                                        styles.langChipText,
                                        { color: active ? cfg.color : theme.colors.subText, fontWeight: active ? '700' : '500' },
                                    ]}
                                >
                                    {cfg.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ── Editor ── */}
                <View style={[styles.editorWrapper, { backgroundColor: isDark ? '#0d0d1a' : '#1e1e2e' }]}>
                    {/* Line numbers */}
                    <View style={styles.lineNumbers}>
                        {(code || LANGUAGES[language].placeholder).split('\n').map((_, i) => (
                            <Text key={i} style={styles.lineNum}>{i + 1}</Text>
                        ))}
                    </View>

                    {/* Code input */}
                    <TextInput
                        style={styles.editor}
                        value={code}
                        onChangeText={handleChangeText}
                        // Controlled selection for programmatic cursor moves
                        selection={selection}
                        onSelectionChange={() => {
                            // Nothing needed here; selection state resets itself via setTimeout
                        }}
                        placeholder={LANGUAGES[language].placeholder}
                        placeholderTextColor="#444"
                        multiline
                        autoCorrect={false}
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck={false}
                        textAlignVertical="top"
                        scrollEnabled={false}
                        keyboardType="default"
                    />
                </View>

                {/* ── Output Panel ── */}
                <View
                    style={[
                        styles.outputPanel,
                        {
                            backgroundColor: isDark ? '#111118' : '#f4f4f8',
                            borderTopColor: theme.colors.border,
                        },
                    ]}
                >
                    <View style={styles.outputHeader}>
                        <View style={styles.outputHeaderLeft}>
                            <View
                                style={[
                                    styles.statusDot,
                                    {
                                        backgroundColor:
                                            output === ''
                                                ? '#666'
                                                : isError
                                                    ? '#ef4444'
                                                    : '#22c55e',
                                    },
                                ]}
                            />
                            <Text style={[styles.outputLabel, { color: theme.colors.subText }]}>
                                {output === '' ? 'Output' : isError ? 'Error' : 'Output'}
                            </Text>
                        </View>
                        {output !== '' && (
                            <TouchableOpacity onPress={() => { setOutput(''); setIsError(false); }}>
                                <Ionicons name="close-circle" size={18} color={theme.colors.subText} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView style={{ flex: 1 }}>
                        {loading ? (
                            <View style={styles.outputLoading}>
                                <ActivityIndicator color={theme.colors.primary} />
                                <Text style={[styles.outputLoadingText, { color: theme.colors.subText }]}>
                                    Running…
                                </Text>
                            </View>
                        ) : (
                            <Text
                                style={[
                                    styles.outputText,
                                    { color: isError ? '#ef4444' : '#22c55e' },
                                ]}
                                selectable
                            >
                                {output || 'Press Run to see output here…'}
                            </Text>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* Header */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: { padding: 6 },
    runBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    runBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    /* Language bar */
    langBar: {
        maxHeight: 48,
        borderBottomWidth: 1,
        width: '100%',
        height: 170
    },
    langChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginVertical: 6,
    },
    langDot: { width: 8, height: 8, borderRadius: 4 },
    langChipText: { fontSize: 13 },

    /* Editor */
    editorWrapper: {
        flex: 1,
        flexDirection: 'row',
        minHeight: 200,
    },
    lineNumbers: {
        paddingTop: 12,
        paddingHorizontal: 8,
        alignItems: 'flex-end',
        backgroundColor: '#0a0a14',
    },
    lineNum: {
        color: '#3a3a5c',
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        lineHeight: 22,
    },
    editor: {
        flex: 1,
        padding: 12,
        color: '#e2e8f0',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        lineHeight: 22,
    },

    /* Output */
    outputPanel: {
        height: 180,
        borderTopWidth: 1,
    },
    outputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 6,
    },
    outputHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    outputLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    outputLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    outputLoadingText: { fontSize: 14 },
    outputText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
        lineHeight: 20,
        paddingHorizontal: 14,
        paddingBottom: 14,
    },
});

export default CompilerScreen;
