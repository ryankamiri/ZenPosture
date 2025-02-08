const mongoose = require('mongoose');

const postureSessionSchema = new mongoose.Schema({
    postureScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    UserID: {
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
    postureSessions: {
        monday: [postureSessionSchema],
        tuesday: [postureSessionSchema],
        wednesday: [postureSessionSchema],
        thursday: [postureSessionSchema],
        friday: [postureSessionSchema],
        saturday: [postureSessionSchema],
        sunday: [postureSessionSchema]
    }
});

// Helper method to get today's posture sessions
userSchema.methods.getTodaySessions = function() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    return this.postureSessions[today];
};

// Helper method to add a posture session for today
userSchema.methods.addPostureSession = function(sessionData) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    this.postureSessions[today].push({
        postureScore: sessionData.postureScore,
        duration: sessionData.duration,
        date: new Date()
    });
    return this.save();
};

// Static method to find or create user by HWID
userSchema.statics.findOrCreateByHWID = async function(hwid) {
    let user = await this.findOne({ UserID: hwid });
    if (!user) {
        user = new this({
            UserID: hwid,
            postureSessions: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
            }
        });
        await user.save();
    }
    return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User; 