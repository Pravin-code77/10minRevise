const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.login);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, authController.getMe);

// @route   PUT api/auth/update
// @desc    Update user details
// @access  Private
router.put('/update', authMiddleware, authController.updateDetails);

// @route   PUT api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', authMiddleware, authController.updatePassword);

// @route   GET api/auth/streak
// @desc    Get streak info
// @access  Private
router.get('/streak', authMiddleware, authController.getStreak);

// @route   DELETE api/auth/delete
// @desc    Delete account
// @access  Private
router.delete('/delete', authMiddleware, authController.deleteAccount);

module.exports = router;
