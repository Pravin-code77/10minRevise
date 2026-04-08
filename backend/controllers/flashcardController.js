const Flashcard = require('../models/Flashcard');
const FlashcardSet = require('../models/FlashcardSet');
const { generateFlashcardContent } = require('../utils/aiService');

exports.createSet = async (req, res) => {
    try {
        const { title, description, cards, type } = req.body;
        console.log(`[createSet] START. Title: ${title}, Cards: ${cards ? cards.length : 0}`);

        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // 1. Create Set
        const newSet = new FlashcardSet({
            user: req.user.id,
            title,
            description
        });
        const savedSet = await newSet.save();
        console.log(`[createSet] Set Saved: ${savedSet._id}`);

        let savedCards = [];
        if (cards && cards.length > 0) {
            console.log(`[createSet] Starting parallel AI generation for ${cards.length} cards`);
            const promises = cards.map(async (card, i) => {
                let backContent = card.definition;
                if (type && type !== 'raw') {
                    try {
                        backContent = await generateFlashcardContent(card.definition, type);
                    } catch (aiErr) {
                        console.error(`[createSet] AI Fail for card ${i}: ${aiErr.message}`);
                        backContent = card.definition;
                    }
                }
                const newCard = new Flashcard({
                    user: req.user.id,
                    set: savedSet._id,
                    front: card.term,
                    back: backContent,
                    type: type || 'raw'
                });
                const savedCard = await newCard.save();
                console.log(`[createSet] Card ${i} Saved: ${savedCard._id}`);
                return savedCard;
            });
            savedCards = await Promise.all(promises);
        }

        console.log('[createSet] SUCCESS. Returning response.');
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
            return {
                ...set.toObject(),
                cardCount: count
            };
        }));
        res.json(setsWithCount);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.getSetDetails = async (req, res) => {
    try {
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ msg: 'Invalid Set ID' });
        }
        const set = await FlashcardSet.findById(req.params.id);
        if (!set) {
            return res.status(404).json({ msg: 'Set not found' });
        }
        if (set.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        const cards = await Flashcard.find({ set: req.params.id });
        res.json({ set, cards });
    } catch (err) {
        console.error("ERROR in getSetDetails:", err);
        res.status(500).send('Server error');
    }
};

exports.updateFlashcardStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let flashcard = await Flashcard.findById(req.params.id);
        if (!flashcard) return res.status(404).json({ msg: 'Flashcard not found' });
        if (flashcard.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        flashcard.status = status;
        if (status === 'mastered') {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 3);
            flashcard.nextReviewDate = nextDate;
        } else {
            flashcard.nextReviewDate = new Date();
        }
        await flashcard.save();
        res.json(flashcard);
    } catch (err) {
        console.error(err.message);
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
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const totalSets = await FlashcardSet.countDocuments({ user: userId });
        const cardsMastered = await Flashcard.countDocuments({
            user: userId,
            status: 'mastered'
        });
        const user = await require('../models/User').findById(userId);
        const streak = user ? user.streak : 0;
        res.json({ totalSets, cardsMastered, streak });
    } catch (err) {
        console.error(err.message);
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
        console.error('ERROR:', err.message);
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
        console.error('ERROR:', err.message);
        res.status(500).json({ msg: err.message });
    }
};

exports.addCardToSet = async (req, res) => {
    try {
        const set = await FlashcardSet.findById(req.params.id);
        if (!set) return res.status(404).json({ msg: 'Set not found' });
        if (set.user.toString() !== req.user.id) return res.status(401).json({ msg: 'User not authorized' });
        const { term, definition, type } = req.body;
        let backContent = definition;
        if (type && type !== 'raw') {
            try {
                backContent = await generateFlashcardContent(definition, type);
            } catch (_) {
                backContent = definition;
            }
        }
        const newCard = new Flashcard({
            user: req.user.id,
            set: set._id,
            front: term,
            back: backContent,
            type: type || 'raw',
        });
        const saved = await newCard.save();
        res.json(saved);
    } catch (err) {
        console.error(err.message);
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
        await Flashcard.deleteMany({ set: setId });
        const savedCards = [];
        if (cards && cards.length > 0) {
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                let backContent = card.definition;
                if (type && type !== 'raw') {
                    try {
                        backContent = await generateFlashcardContent(card.definition, type);
                    } catch (_) {
                        backContent = card.definition;
                    }
                }
                const newCard = new Flashcard({
                    user: req.user.id,
                    set: set._id,
                    front: card.term,
                    back: backContent,
                    type: type || 'raw'
                });
                const savedCard = await newCard.save();
                savedCards.push(savedCard);
            }
        }
        res.json({ set, cards: savedCards });
    } catch (err) {
        console.error("Update Set Error:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
};
