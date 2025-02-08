// Suppress the punycode deprecation warning
process.removeAllListeners('warning');

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const User = require('./models/User');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// Initialize or get user by HWID
app.post('/api/users/init', async (req, res) => {
    try {
        const { hwid } = req.body;
        if (!hwid) {
            return res.status(400).json({ error: 'HWID is required' });
        }
        
        const user = await User.findOrCreateByHWID(hwid);
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Posture Session Routes
app.post('/api/posture-sessions/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ UserID: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await user.addPostureSession(req.body);
        res.status(201).json({ message: 'Posture session added successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/posture-sessions/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ UserID: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const todaySessions = user.getTodaySessions();
        res.json(todaySessions);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Statistics Route
app.get('/api/statistics/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ UserID: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const todaySessions = user.getTodaySessions();
        
        // Calculate statistics
        const totalDuration = todaySessions.reduce((sum, session) => sum + session.duration, 0);
        const averageScore = todaySessions.length > 0
            ? todaySessions.reduce((sum, session) => sum + session.postureScore, 0) / todaySessions.length
            : 0;

        res.json({
            dailyStats: {
                averagePostureScore: averageScore,
                totalPostureTime: totalDuration,
                sessionsCount: todaySessions.length
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is running!',
        timestamp: new Date(),
        status: 'OK'
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
