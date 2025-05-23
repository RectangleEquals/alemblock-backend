const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true,
        unique: true,
    },
	authCode: {
		type: String,
	},
    userName: {
        type: String,
    },
	avatarUrl: {
		type: String,
	},
    accessToken: {
        type: String,
    },
	refreshToken: {
		type: String,
	},
    expiresAt: {
        type: Date,
        default: Date.now,
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('User', userSchema);
