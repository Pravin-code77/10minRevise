const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/auth');
const flashcardRoutes = require('./routes/flashcards');
const compilerRoutes = require('./routes/compiler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Connect Database
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error('MONGO_URI is missing from .env');
            process.exit(1);
        }
        await mongoose.connect(uri);
        console.log('MongoDB Connected Successfully');
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
};

connectDB();

// Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/compiler', compilerRoutes);

// Base Health Check
app.get('/api', (req, res) => {
    res.json({ status: 'online', mode: 'local', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER_ERROR:', err.stack);
    res.status(500).json({ msg: 'Internal Server Error', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Server is running properly!
----------------------------------
PORT: ${PORT}
ENV:  ${process.env.NODE_ENV || 'development'}
URL:  http://localhost:${PORT}/api
----------------------------------
    `);
});
