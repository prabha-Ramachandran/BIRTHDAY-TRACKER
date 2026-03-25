const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Birthday = require('./models/birthday');

const app = express();
const JWT_SECRET = 'birthday_tracker_secret_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
const mongoURI = 'mongodb://localhost:27017/birthdayDB';

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log('MongoDB Error:', err));

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Please login first' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already exists' });
        const user = new User({ name, email, password });
        await user.save();
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/birthdays', authMiddleware, async (req, res) => {
    try {
        const birthdays = await Birthday.find({ userId: req.userId });
        res.json(birthdays);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/birthdays/:id', authMiddleware, async (req, res) => {
    try {
        const birthday = await Birthday.findOne({ _id: req.params.id, userId: req.userId });
        if (!birthday) return res.status(404).json({ error: 'Not found' });
        res.json(birthday);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/birthdays', authMiddleware, async (req, res) => {
    try {
        const birthday = new Birthday({ ...req.body, userId: req.userId });
        await birthday.save();
        res.status(201).json(birthday);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/birthdays/:id', authMiddleware, async (req, res) => {
    try {
        const updated = await Birthday.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Not found' });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/birthdays/:id', authMiddleware, async (req, res) => {
    try {
        const deleted = await Birthday.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!deleted) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});