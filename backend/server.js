// Suppress the punycode deprecation warning
process.removeAllListeners('warning');

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const User = require('./models/User');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5001;

// Middleware - make sure these come before routes
app.use(cors({
    origin: ['http://localhost:5173', 'app://.*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Connect to Database
connectDB();

// Initialize or get user by HWID
app.post('/api/users/init', async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        const { hwid } = req.body;
        
        if (!hwid) {
            console.error('No HWID in request body:', req.body);
            return res.status(400).json({ 
                error: 'HWID is required',
                receivedBody: req.body 
            });
        }
        
        console.log('Looking for user with HWID:', hwid);
        let user = await User.findOne({ HWID: hwid });
        
        if (user) {
            console.log('Found existing user:', hwid);
            // Verify postureSessions structure
            if (!user.postureSessions || !user.postureSessions.monday) {
                console.log('Fixing postureSessions structure for existing user');
                user.postureSessions = {
                    monday: [],
                    tuesday: [],
                    wednesday: [],
                    thursday: [],
                    friday: [],
                    saturday: [],
                    sunday: []
                };
                await user.save();
            }
            return res.json(user);
        }

        // Create new user
        try {
            const newUser = {
                HWID: hwid,
                postureSessions: {
                    monday: [],
                    tuesday: [],
                    wednesday: [],
                    thursday: [],
                    friday: [],
                    saturday: [],
                    sunday: []
                },
                createdAt: new Date()
            };
            
            console.log('Creating new user with structure:', JSON.stringify(newUser, null, 2));
            user = new User(newUser);
            await user.save();
            console.log('Created new user with HWID:', hwid);
            return res.json(user);
        } catch (err) {
            if (err.code === 11000) {
                user = await User.findOne({ HWID: hwid });
                if (user) {
                    console.log('Found user after duplicate key error:', hwid);
                    return res.json(user);
                }
            }
            throw err;
        }
    } catch (error) {
        console.error('Error in user init:', error);
        res.status(500).json({ 
            error: error.message,
            receivedBody: req.body
        });
    }
});

// Posture Session Routes
app.post('/api/posture-sessions/:hwid', async (req, res) => {
    try {
        const user = await User.findOne({ HWID: req.params.hwid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.addPostureSession(req.body);
        res.status(201).json({ message: 'Posture session added successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get today's sessions
app.get('/api/posture-sessions/:hwid', async (req, res) => {
    try {
        const user = await User.findOne({ HWID: req.params.hwid });
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
app.get('/api/statistics/:hwid', async (req, res) => {
    try {
        const user = await User.findOne({ HWID: req.params.hwid });
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

// Get all users endpoint
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({})
            .select('-__v') // Exclude the version key
            .sort({ createdAt: -1 }); // Sort by creation date, newest first
        
        // Map the users to include session counts and other relevant data
        const enhancedUsers = users.map(user => {
            const todaySessions = user.getTodaySessions();
            
            return {
                HWID: user.HWID, // Make sure HWID is included
                createdAt: user.createdAt,
                lastActive: user.postureSessions ? 
                    new Date() : // If there are sessions, use current date
                    user.createdAt, // Otherwise use creation date
                stats: {
                    totalSessions: Object.values(user.postureSessions || {}).reduce((sum, day) => sum + (day?.length || 0), 0),
                    todaySessions: todaySessions?.length || 0,
                    averageScore: todaySessions?.length > 0
                        ? todaySessions.reduce((sum, session) => sum + session.postureScore, 0) / todaySessions.length
                        : 0
                },
                settings: {
                    notificationsEnabled: user.notificationsEnabled,
                    notificationInterval: user.notificationInterval
                }
            };
        });

        res.json({
            total: users.length,
            users: enhancedUsers
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            error: 'Failed to fetch users',
            details: error.message 
        });
    }
});

// Get single user endpoint
app.get('/api/users/:hwid', async (req, res) => {
    try {
        const user = await User.findOne({ HWID: req.params.hwid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const todaySessions = user.getTodaySessions();
        const totalSessions = user.postureSessions.monday.length + 
                            user.postureSessions.tuesday.length +
                            user.postureSessions.wednesday.length +
                            user.postureSessions.thursday.length +
                            user.postureSessions.friday.length +
                            user.postureSessions.saturday.length +
                            user.postureSessions.sunday.length;

        res.json({
            HWID: user.HWID,
            createdAt: user.createdAt,
            lastActive: user.postureSessions.length > 0 
                ? user.postureSessions[user.postureSessions.length - 1].date 
                : user.createdAt,
            stats: {
                totalSessions,
                todaySessions: todaySessions.length,
                averageScore: todaySessions.length > 0
                    ? todaySessions.reduce((sum, session) => sum + session.postureScore, 0) / todaySessions.length
                    : 0
            },
            settings: {
                notificationsEnabled: user.notificationsEnabled,
                notificationInterval: user.notificationInterval
            },
            sessions: {
                today: todaySessions,
                total: totalSessions
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user',
            details: error.message 
        });
    }
});

// Debug endpoint to check user structure
app.get('/api/debug/user/:hwid', async (req, res) => {
    try {
        const user = await User.findOne({ HWID: req.params.hwid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Return the raw user object
        res.json({
            user: user.toObject(),
            postureSessions: user.postureSessions,
            hasPostureSessions: !!user.postureSessions,
            postureSessionsType: typeof user.postureSessions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
