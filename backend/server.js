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
// app.use(cors({
//     origin: ['http://localhost:5173', 'app://.*'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type']
// }));

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
            return res.json(user);
        }

        // Create new user
        try {
            const newUser = {
                HWID: hwid,
                postureSessions: {
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

// Helper function to organize sessions by month
const organizeSessionsByMonth = (postureSessions) => {
    console.log("[AGGREGATE] Organizing sessions by month");
    const sessionsByMonth = {};
    
    // Loop through each day of the week
    for (const day in postureSessions) {
        const sessions = postureSessions[day] || [];
        console.log(`[AGGREGATE] Processing ${sessions.length} sessions for ${day}`);
        
        // Process each session in this day
        sessions.forEach(session => {
            // Skip if session doesn't have date information
            if (!session.date) {
                console.log("[AGGREGATE] Session missing date field, skipping");
                return;
            }
            
            const sessionDate = new Date(session.date);
            if (isNaN(sessionDate.getTime())) {
                console.log(`[AGGREGATE] Invalid date format: ${session.date}, skipping`);
                return;
            }
            
            // Create key in format YYYY-MM
            const monthKey = `${sessionDate.getFullYear()}-${(sessionDate.getMonth() + 1).toString().padStart(2, '0')}`;
            
            // Initialize month data if needed
            if (!sessionsByMonth[monthKey]) {
                sessionsByMonth[monthKey] = {
                    year: sessionDate.getFullYear(),
                    month: sessionDate.getMonth() + 1,
                    totalSessions: 0,
                    totalScore: 0,
                    averageScore: 0,
                    totalDuration: 0,
                    lowestScore: Infinity,
                    highestScore: 0
                };
            }
            
            // Update month stats
            const monthData = sessionsByMonth[monthKey];
            monthData.totalSessions++;
            monthData.totalScore += session.postureScore || 0;
            monthData.totalDuration += session.duration || 0;
            
            // Track highest and lowest scores
            if (session.postureScore > monthData.highestScore) {
                monthData.highestScore = session.postureScore;
            }
            if (session.postureScore < monthData.lowestScore) {
                monthData.lowestScore = session.postureScore;
            }
            
            // Recalculate average
            monthData.averageScore = monthData.totalScore / monthData.totalSessions;
        });
    }
    
    // If there were no lowest scores recorded (empty data), set to 0
    for (const monthKey in sessionsByMonth) {
        if (sessionsByMonth[monthKey].lowestScore === Infinity) {
            sessionsByMonth[monthKey].lowestScore = 0;
        }
    }
    
    console.log(`[AGGREGATE] Organized data into ${Object.keys(sessionsByMonth).length} months`);
    return sessionsByMonth;
};

// Helper function to organize sessions by year
const organizeSessionsByYear = (postureSessions) => {
    console.log("[AGGREGATE] Organizing sessions by year");
    const sessionsByYear = {};
    
    // Loop through each day of the week
    for (const day in postureSessions) {
        const sessions = postureSessions[day] || [];
        console.log(`[AGGREGATE] Processing ${sessions.length} sessions for ${day}`);
        
        // Process each session in this day
        sessions.forEach(session => {
            // Skip if session doesn't have date information
            if (!session.date) {
                console.log("[AGGREGATE] Session missing date field, skipping");
                return;
            }
            
            const sessionDate = new Date(session.date);
            if (isNaN(sessionDate.getTime())) {
                console.log(`[AGGREGATE] Invalid date format: ${session.date}, skipping`);
                return;
            }
            
            // Use year as key
            const yearKey = sessionDate.getFullYear().toString();
            
            // Initialize year data if needed
            if (!sessionsByYear[yearKey]) {
                sessionsByYear[yearKey] = {
                    year: sessionDate.getFullYear(),
                    totalSessions: 0,
                    totalScore: 0,
                    averageScore: 0,
                    totalDuration: 0,
                    monthsActive: new Set(),
                    lowestScore: Infinity,
                    highestScore: 0
                };
            }
            
            // Update year stats
            const yearData = sessionsByYear[yearKey];
            yearData.totalSessions++;
            yearData.totalScore += session.postureScore || 0;
            yearData.totalDuration += session.duration || 0;
            yearData.monthsActive.add(sessionDate.getMonth() + 1);
            
            // Track highest and lowest scores
            if (session.postureScore > yearData.highestScore) {
                yearData.highestScore = session.postureScore;
            }
            if (session.postureScore < yearData.lowestScore) {
                yearData.lowestScore = session.postureScore;
            }
            
            // Recalculate average
            yearData.averageScore = yearData.totalScore / yearData.totalSessions;
        });
    }
    
    // Convert Set to array length for months active count and handle edge cases
    for (const yearKey in sessionsByYear) {
        sessionsByYear[yearKey].monthsActive = sessionsByYear[yearKey].monthsActive.size;
        if (sessionsByYear[yearKey].lowestScore === Infinity) {
            sessionsByYear[yearKey].lowestScore = 0;
        }
    }
    
    console.log(`[AGGREGATE] Organized data into ${Object.keys(sessionsByYear).length} years`);
    return sessionsByYear;
};

// Monthly Statistics Route
app.get('/api/statistics/:hwid/monthly', async (req, res) => {
    try {
        console.log(`[API] Fetching monthly statistics for HWID: ${req.params.hwid}`);
        console.log(`[API] Query params:`, req.query);
        
        const user = await User.findOne({ HWID: req.params.hwid });
        if (!user) {
            console.log(`[API] User not found: ${req.params.hwid}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user has posture sessions
        if (!user.postureSessions) {
            console.log(`[API] User has no posture sessions data`);
            return res.json({ 
                monthlyStats: {},
                message: 'No posture data available'
            });
        }
        
        // Calculate monthly stats
        const monthlyStats = organizeSessionsByMonth(user.postureSessions);
        
        // Filter by year if provided
        const { year } = req.query;
        let filteredStats = monthlyStats;
        
        if (year && !isNaN(parseInt(year))) {
            console.log(`[API] Filtering results by year: ${year}`);
            filteredStats = Object.keys(monthlyStats)
                .filter(key => key.startsWith(year))
                .reduce((obj, key) => {
                    obj[key] = monthlyStats[key];
                    return obj;
                }, {});
        }
        
        console.log(`[API] Successfully calculated monthly stats: ${Object.keys(filteredStats).length} months found`);
        res.json({ 
            monthlyStats: filteredStats,
            totalMonths: Object.keys(filteredStats).length
        });
    } catch (error) {
        console.error('[API] Error calculating monthly stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Yearly Statistics Route
app.get('/api/statistics/:hwid/yearly', async (req, res) => {
    try {
        console.log(`[API] Fetching yearly statistics for HWID: ${req.params.hwid}`);
        
        const user = await User.findOne({ HWID: req.params.hwid });
        if (!user) {
            console.log(`[API] User not found: ${req.params.hwid}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user has posture sessions
        if (!user.postureSessions) {
            console.log(`[API] User has no posture sessions data`);
            return res.json({ 
                yearlyStats: {},
                message: 'No posture data available'
            });
        }
        
        // Calculate yearly stats
        const yearlyStats = organizeSessionsByYear(user.postureSessions);
        
        console.log(`[API] Successfully calculated yearly stats: ${Object.keys(yearlyStats).length} years found`);
        res.json({ 
            yearlyStats: yearlyStats,
            totalYears: Object.keys(yearlyStats).length
        });
    } catch (error) {
        console.error('[API] Error calculating yearly stats:', error);
        res.status(500).json({ error: error.message });
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

// Debug endpoint to examine posture sessions structure
app.get('/api/debug/posture-sessions/:hwid', async (req, res) => {
    try {
        console.log(`[DEBUG] Examining posture sessions structure for HWID: ${req.params.hwid}`);
        
        const user = await User.findOne({ HWID: req.params.hwid });
        if (!user) {
            console.log(`[DEBUG] User not found: ${req.params.hwid}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Log the structure of postureSessions
        console.log(`[DEBUG] User found, postureSessions keys:`, Object.keys(user.postureSessions || {}));
        
        // Look for any day with sessions to sample
        let sampleDay = null;
        let sampleSession = null;
        
        for (const day in user.postureSessions) {
            if (user.postureSessions[day]?.length > 0) {
                sampleDay = day;
                sampleSession = user.postureSessions[day][0];
                break;
            }
        }
        
        if (sampleSession) {
            console.log(`[DEBUG] Sample session from ${sampleDay}:`, sampleSession);
        } else {
            console.log(`[DEBUG] No sessions found in any day`);
        }
        
        // Check if sessions have timestamps or date information
        let hasDateInfo = false;
        let dateFormat = 'none';
        
        if (sampleSession) {
            hasDateInfo = !!sampleSession.date || !!sampleSession.timestamp;
            if (sampleSession.date) {
                dateFormat = `date: ${sampleSession.date} (${typeof sampleSession.date})`;
            } else if (sampleSession.timestamp) {
                dateFormat = `timestamp: ${sampleSession.timestamp} (${typeof sampleSession.timestamp})`;
            }
        }
        
        console.log(`[DEBUG] Sessions contain date/timestamp info: ${hasDateInfo}, format: ${dateFormat}`);
        
        const sessionCounts = {};
        let totalSessions = 0;
        
        // Count sessions in each day
        for (const day in user.postureSessions) {
            sessionCounts[day] = (user.postureSessions[day] || []).length;
            totalSessions += sessionCounts[day];
        }
        
        console.log(`[DEBUG] Session counts by day:`, sessionCounts);
        console.log(`[DEBUG] Total sessions:`, totalSessions);
        
        res.json({
            hasPostureSessions: !!user.postureSessions,
            sessionFormat: user.postureSessions ? 'by day of week' : 'unknown',
            containsDateInfo: hasDateInfo,
            dateFormat: dateFormat,
            sessionCounts: sessionCounts,
            totalSessions: totalSessions,
            sampleStructure: sampleSession ? {
                [sampleDay]: sampleSession
            } : 'No sessions found'
        });
    } catch (error) {
        console.error('[DEBUG] Error examining posture sessions:', error);
        res.status(500).json({ error: error.message });
    }
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
