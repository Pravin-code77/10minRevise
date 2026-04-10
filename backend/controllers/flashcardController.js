const Flashcard = require('../models/Flashcard');
const FlashcardSet = require('../models/FlashcardSet');
const { generateFlashcardContent } = require('../utils/aiService');

/**
 * Optimized helper to process cards with AI in parallel
 * while intelligently detecting if re-processing is needed.
 */
const processCardsIntelligently = async (cards, type, userId, setId) => {
    return await Promise.all((cards || []).map(async (cardData) => {
        let backContent = cardData.definition;
        let shouldRunAI = type && type !== 'raw';

        // Check if this is an existing card
        if (cardData.id && shouldRunAI) {
            const existing = await Flashcard.findById(cardData.id);
            if (existing && existing.originalText === cardData.definition && existing.type === type) {
                shouldRunAI = false;
                backContent = existing.back;
                console.log(`[AI] Skipping re-generation for: ${cardData.term}`);
            }
        }

        if (shouldRunAI) {
            console.log(`[AI] Processing: ${cardData.term} as ${type}`);
            backContent = await generateFlashcardContent(cardData.definition, type);
        }

        return {
            id: cardData.id,
            user: userId,
            set: setId,
            front: cardData.term,
            back: backContent,
            originalText: cardData.definition,
            type: type || 'raw'
        };
    }));
};

exports.createSet = async (req, res) => {
    try {
        const { title, description, cards, type } = req.body;
        if (!req.user || !req.user.id) return res.status(401).json({ msg: 'User not authorized' });

        // 1. Create Set
        const newSet = new FlashcardSet({ user: req.user.id, title, description });
        const savedSet = await newSet.save();

        // 2. Process Cards
        const processedCards = await processCardsIntelligently(cards || [], type, req.user.id, savedSet._id);

        // 3. Save Cards
        const cardsToInsert = processedCards.map(c => ({
            user: c.user,
            set: c.set,
            front: c.front,
            back: c.back,
            originalText: c.originalText,
            type: c.type
        }));
        
        const savedCards = await Flashcard.insertMany(cardsToInsert);
        res.json({ set: savedSet, cards: savedCards });

    } catch (err) {
        console.error('Create Set Error:', err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

exports.getAllSets = async (req, res) => {
    try {
        const sets = await FlashcardSet.find({ user: req.user.id }).sort({ createdAt: -1 });
        const setsWithCount = await Promise.all(sets.map(async (set) => {
            const count = await Flashcard.countDocuments({ set: set._id });
            return { ...set.toObject(), cardCount: count };
        }));
        res.json(setsWithCount);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.getSetDetails = async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ msg: 'Invalid Set ID' });
        const set = await FlashcardSet.findById(req.params.id);
        if (!set) return res.status(404).json({ msg: 'Set not found' });
        if (set.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
        const cards = await Flashcard.find({ set: req.params.id });
        res.json({ set, cards });
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.updateFlashcardStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let flashcard = await Flashcard.findById(req.params.id);
        if (!flashcard) return res.status(404).json({ msg: 'Flashcard not found' });
        if (flashcard.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
        
        flashcard.status = status;
        const nextDate = new Date();
        if (status === 'mastered') {
            nextDate.setDate(nextDate.getDate() + 3);
        }
        flashcard.nextReviewDate = nextDate;
        
        await flashcard.save();
        res.json(flashcard);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.getDueFlashcards = async (req, res) => {
    try {
        const flashcards = await Flashcard.find({
            user: req.user.id,
            nextReviewDate: { $lte: new Date() }
        }).sort({ nextReviewDate: 1 });
        res.json(flashcards);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const totalSets = await FlashcardSet.countDocuments({ user: userId });
        const cardsMastered = await Flashcard.countDocuments({ user: userId, status: 'mastered' });
        const user = await require('../models/User').findById(userId);
        res.json({ totalSets, cardsMastered, streak: user ? user.streak : 0 });
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.deleteSet = async (req, res) => {
    try {
        const set = await FlashcardSet.findById(req.params.id);
        if (!set) return res.status(404).json({ msg: 'Set not found' });
        if (set.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
        await Flashcard.deleteMany({ set: req.params.id });
        await FlashcardSet.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Set deleted' });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
};

exports.deleteCard = async (req, res) => {
    try {
        const card = await Flashcard.findById(req.params.cardId);
        if (!card) return res.status(404).json({ msg: 'Card not found' });
        if (card.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
        await Flashcard.findByIdAndDelete(req.params.cardId);
        res.json({ msg: 'Card deleted' });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
};

exports.addCardToSet = async (req, res) => {
    try {
        const set = await FlashcardSet.findById(req.params.id);
        if (!set) return res.status(404).json({ msg: 'Set not found' });
        if (set.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
        
        const { term, definition, type } = req.body;
        const processed = await processCardsIntelligently([{ term, definition }], type, req.user.id, set._id);
        const cardData = processed[0];

        const newCard = new Flashcard({
            user: req.user.id,
            set: set._id,
            front: cardData.front,
            back: cardData.back,
            originalText: cardData.originalText,
            type: cardData.type,
        });
        const saved = await newCard.save();
        res.json(saved);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.updateSet = async (req, res) => {
    try {
        const { title, description, cards, type } = req.body;
        const setId = req.params.id;
        const set = await FlashcardSet.findById(setId);
        if (!set) return res.status(404).json({ msg: 'Set not found' });
        if (set.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });

        set.title = title || set.title;
        set.description = description !== undefined ? description : set.description;
        await set.save();

        // 1. Process Cards Intelligently
        const processedCards = await processCardsIntelligently(cards || [], type, req.user.id, setId);

        // 2. Resolve differences (CRUD on cards)
        const incomingIds = processedCards.filter(c => c.id).map(c => c.id);
        
        // Delete cards that are no longer in the set
        await Flashcard.deleteMany({ set: setId, _id: { $nin: incomingIds } });

        // Update or Insert cards
        const finalCards = [];
        for (const cardData of processedCards) {
            if (cardData.id) {
                // Update existing: Keep status and nextReviewDate unless they drastically changed? No, keep them.
                const updated = await Flashcard.findByIdAndUpdate(cardData.id, {
                    front: cardData.front,
                    back: cardData.back,
                    originalText: cardData.originalText,
                    type: cardData.type
                }, { new: true });
                finalCards.push(updated);
            } else {
                // Create new
                const newCard = new Flashcard({
                    user: req.user.id,
                    set: setId,
                    front: cardData.front,
                    back: cardData.back,
                    originalText: cardData.originalText,
                    type: cardData.type
                });
                const saved = await newCard.save();
                finalCards.push(saved);
            }
        }

        res.json({ set, cards: finalCards });
    } catch (err) {
        console.error("Update Set Error:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
};
