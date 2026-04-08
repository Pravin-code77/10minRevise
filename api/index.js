const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Load environment variables manually from backend/.env if it exists (for local testing)
try {
    require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
} catch (_) {}

// PRE-LOAD MODELS FOR SERVERLESS STABILITY
require('../backend/models/User');
require('../backend/models/FlashcardSet');
require('../backend/models/Flashcard');

// Import Routes
const authRoutes = require('../backend/routes/auth');
const flashcardRoutes = require('../backend/routes/flashcards');
const compilerRoutes = require('../backend/routes/compiler');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false, // Disable for easier dev/web-app integration
}));
app.use(morgan('dev'));

// Mongoose connection cache for serverless
let isConnected = false;
const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('CRITICAL: MONGO_URI is not set in Vercel/Env!');
        throw new Error('Database connection string missing');
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000,
        });
        isConnected = true;
        console.log('MongoDB Connected to Atlas');
    } catch (err) {
        console.error('Mongoose Connection Error:', err.message);
        throw err;
    }
};

// Self-contained DB write test
app.get('/api/test-db', async (req, res) => {
    try {
        const User = require('../backend/models/User');
        const testUser = new User({
            name: 'Test DB',
            email: `test_${Date.now()}@test.com`,
            password: 'test'
        });
        await testUser.save();
        const found = await User.findById(testUser._id);
        await User.findByIdAndDelete(testUser._id);
        res.json({ success: true, email: found.email });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// Crash test for Flashcard Model
app.get('/api/flash-test', (req, res) => {
    try {
        const Flashcard = require('../backend/models/Flashcard');
        res.json({ msg: 'Flashcard model loaded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Database connectivity middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ 
            msg: 'Database connection failed', 
            error: err.message 
        });
    }
});

// Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/compiler', compilerRoutes);

// Base Health Check
app.get('/api', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'ReviseRight API is running',
        timestamp: new Date().toISOString()
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('GLOBAL_ERROR:', err);
    res.status(500).json({
        msg: 'Internal Server Error',
        error: err.message
    });
});

module.exports = app;
