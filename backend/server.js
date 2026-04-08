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

// Mongoose connection cache for serverless (avoids new connection per request)
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI is not set!');
        throw new Error('MONGO_URI environment variable is missing');
    }
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000,
    });
    isConnected = true;
    console.log('MongoDB Connected');
};

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('DB connection failed:', err.message);
        res.status(500).json({ msg: 'Database connection failed' });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/compiler', compilerRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('ReviseRight Backend Running');
});

// Temp debug: check env + db connection
app.get('/api/debug', async (req, res) => {
    res.json({
        mongoUriSet: !!process.env.MONGO_URI,
        mongoUriPrefix: process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'NOT SET',
        dbState: mongoose.connection.readyState, // 0=disconnected,1=connected,2=connecting
        nodeEnv: process.env.NODE_ENV
    });
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
}

module.exports = app;
