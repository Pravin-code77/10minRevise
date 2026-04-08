const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch (_) {}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const flashcardRoutes = require('./routes/flashcards');
const compilerRoutes = require('./routes/compiler');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Connect to MongoDB eagerly at module load (works for both serverless and regular server)
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI && mongoose.connection.readyState === 0) {
    mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
    })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err.message));
} else if (!MONGO_URI) {
    console.error('MONGO_URI is not set!');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/compiler', compilerRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState });
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
}

module.exports = app;
