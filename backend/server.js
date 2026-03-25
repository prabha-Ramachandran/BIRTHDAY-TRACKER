const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const JWT_SECRET = 'birthday_tracker_secret_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/birthday_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS birthdays (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name TEXT,
                birthdate TEXT
            )
        `);
        console.log('Database tables ready');
    } catch (err) {
        console.log('Database error:', err.message);
    }
};
initDB();

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
        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashedPassword]
        );
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/birthdays', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM birthdays WHERE user_id = $1', [req.userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/birthdays/:id', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM birthdays WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/birthdays', authMiddleware, async (req, res) => {
    try {
        const { name, birthdate } = req.body;
        const result = await pool.query(
            'INSERT INTO birthdays (user_id, name, birthdate) VALUES ($1, $2, $3) RETURNING *',
            [req.userId, name, birthdate]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/birthdays/:id', authMiddleware, async (req, res) => {
    try {
        const { name, birthdate } = req.body;
        const result = await pool.query(
            'UPDATE birthdays SET name = $1, birthdate = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
            [name, birthdate, req.params.id, req.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/birthdays/:id', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM birthdays WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
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