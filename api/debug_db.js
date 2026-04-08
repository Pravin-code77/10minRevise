const mongoose = require('mongoose');

module.exports = async (req, res) => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error('MONGO_URI missing');

        // Self-contained connection
        await mongoose.connect(uri);
        
        // Define simple schema on the fly
        const TestSchema = new mongoose.Schema({ name: String });
        const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);
        
        const test = new TestModel({ name: 'Vercel Test ' + Date.now() });
        await test.save();
        
        await mongoose.disconnect();
        
        res.json({ success: true, message: 'Isolated DB write works!' });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};
