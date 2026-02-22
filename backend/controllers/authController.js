const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const updateStreak = async (user) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // e.g. '2026-02-22'

    let lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    if (!lastActive) {
        user.streak = 1;
        user.lastActiveDate = new Date();
    } else {
        const diffTime = Math.abs(today - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            user.streak += 1;
            user.lastActiveDate = new Date();
        } else if (diffDays > 1) {
            user.streak = 1;
            user.lastActiveDate = new Date();
        }
        // If diffDays === 0, already updated today — no change
    }

    // Record today in activeDays (no duplicates)
    if (!user.activeDays) user.activeDays = [];
    if (!user.activeDays.includes(todayStr)) {
        user.activeDays.push(todayStr);
        // Keep only the last 90 days to avoid unbounded growth
        if (user.activeDays.length > 90) {
            user.activeDays = user.activeDays.slice(-90);
        }
    }

    await user.save();
};

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name,
            email,
            password,
            streak: 1,
            lastActiveDate: Date.now()
        });

        // Password hashing is handled in the model pre-save hook
        await user.save();

        res.status(201).json({ msg: 'User registered successfully. Please login.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        await updateStreak(user);

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user) await updateStreak(user);
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.updateDetails = async (req, res) => {
    const { name, email, reminderEnabled, reminderTime } = req.body;
    console.log(`[DEBUG] updateDetails called for user ${req.user.id}. Fields:`, { name, email, reminderEnabled, reminderTime });

    try {
        let user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (reminderEnabled !== undefined) user.reminderEnabled = reminderEnabled;
        if (reminderTime) user.reminderTime = reminderTime;

        await user.save();
        console.log('[DEBUG] User updated successfully');
        res.json(user);
    } catch (err) {
        console.error('[DEBUG] Update Error:', err.message);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Email is already in use' });
        }
        res.status(500).send('Server error');
    }
};

exports.updatePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Current Password' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();
        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.getStreak = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('streak lastActiveDate activeDays name');
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Update streak on every fetch (marks daily activity)
        await updateStreak(user);

        // Return last 30 active days for the weekly calendar dots
        const last30 = (user.activeDays || []).slice(-30);

        res.json({
            streak: user.streak,
            lastActiveDate: user.lastActiveDate,
            activeDays: last30,
            name: user.name,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const FlashcardSet = require('../models/FlashcardSet');
        const Flashcard = require('../models/Flashcard');

        await Flashcard.deleteMany({ user: req.user.id });
        await FlashcardSet.deleteMany({ user: req.user.id });
        await User.findByIdAndDelete(req.user.id);

        res.json({ msg: 'Account deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
