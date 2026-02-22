const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const flashcardController = require('../controllers/flashcardController');


// Stats Route
router.get('/stats', auth, flashcardController.getStats);

// @route   POST api/flashcards/sets
router.post('/sets', auth, flashcardController.createSet);

// @route   PUT api/flashcards/sets/:id
router.put('/sets/:id', auth, flashcardController.updateSet);

// @route   GET api/flashcards/sets
router.get('/sets', auth, flashcardController.getAllSets);

// @route   GET api/flashcards/sets/:id
router.get('/sets/:id', auth, flashcardController.getSetDetails);

// @route   DELETE api/flashcards/sets/:id   — delete entire set + its cards
router.delete('/sets/:id', auth, flashcardController.deleteSet);

// @route   DELETE api/flashcards/sets/:id/cards/:cardId   — delete one card
router.delete('/sets/:id/cards/:cardId', auth, flashcardController.deleteCard);

// @route   POST api/flashcards/sets/:id/cards   — add one card to a set
router.post('/sets/:id/cards', auth, flashcardController.addCardToSet);

// @route   GET api/flashcards/due
router.get('/due', auth, flashcardController.getDueFlashcards);

// @route   PUT api/flashcards/:id/status
router.put('/:id/status', auth, flashcardController.updateFlashcardStatus);

module.exports = router;
