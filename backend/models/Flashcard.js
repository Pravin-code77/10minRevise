const mongoose = require('mongoose');

const FlashcardSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    set: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FlashcardSet',
        required: true
    },
    front: {
        type: String,
        required: true
    },
    back: {
        type: String, 
        required: true
    },
    type: {
        type: String,
        enum: ['visualize', 'simplify', 'raw'],
        default: 'raw'
    },
    status: {
        type: String,
        enum: ['learning', 'mastered'],
        default: 'learning'
    },
    nextReviewDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.Flashcard || mongoose.model('Flashcard', FlashcardSchema);
