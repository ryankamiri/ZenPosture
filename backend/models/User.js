const mongoose = require('mongoose');

const postureSessionSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    score: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    }
});

const userSchema = new mongoose.Schema({
    HWID: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    notificationsEnabled: {
        type: Boolean,
        default: true
    },
    notificationInterval: {
        type: Number,
        default: 60
    },
    postureSessions: [postureSessionSchema],
    createdAt: {
        type: Date,
        default: Date.now
    }

}, { strict: true });

// Helper method to get today's posture sessions
userSchema.methods.getTodaySessions = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.postureSessions.filter(session => {
        const sessionDate = new Date(session.timestamp);
        return sessionDate >= today;
    });
};

// Helper method to add a posture session
userSchema.methods.addPostureSession = function(sessionData) {
    this.postureSessions.push({
        timestamp: Date.now(),
        score: sessionData.score,
        duration: sessionData.duration
    });
    return this.save();
};

// Static method to find or create user by HWID
userSchema.statics.findOrCreateByHWID = async function(hwid) {
    let user = await this.findOne({ HWID: hwid });
    if (!user) {
        user = new this({
            HWID: hwid,
            postureSessions: []
        });
        await user.save();
    }
    return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;