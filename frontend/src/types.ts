export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type RootStackParamList = {
    AppTabs: undefined;
    ExportData: undefined;
};

export type AppTabParamList = {
    Home: undefined;
    Create: undefined;
    Revision: undefined;
    Compiler: undefined;
    Profile: undefined;
};

export interface Flashcard {
    _id: string;
    front: string;
    back: string;
    type: 'visualize' | 'simplify' | 'raw';
    status: 'learning' | 'mastered';
}

export interface FlashcardSet {
    _id: string;
    title: string;
    description?: string;
    cardCount?: number;
    createdAt?: string;
}
