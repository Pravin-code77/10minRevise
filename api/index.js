const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// PRE-LOAD MODELS FOR SERVERLESS STABILITY
const User = require('../backend/models/User');
const FlashcardSet = require('../backend/models/FlashcardSet');
const Flashcard = require('../backend/models/Flashcard');

// Import Routes
const authRoutes = require('../backend/routes/auth');
const flashcardRoutes = require('../backend/routes/flashcards');
const compilerRoutes = require('../backend/routes/compiler');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Mongoose connection cache for serverless
let isConnected = false;
const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI missing');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    isConnected = true;
};

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ msg: 'Database connection failed', error: err.message });
    }
});

// Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/compiler', compilerRoutes);

// Base Health Check
app.get('/api', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER_ERROR:', err.message);
    res.status(500).json({ msg: 'Internal Server Error', error: err.message });
});

module.exports = app;
