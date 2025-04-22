require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

const URI_USERS = process.env.DB_URI_USERS;

async function connect(onsuccess, onerror) {
    let connection = undefined;
    try {
        connection = await mongoose.connect(URI_USERS);
        if (onsuccess) onsuccess(connection);
    } catch (error) {
        if (onerror) onerror(error);
    }
}

async function getUser(discordId) {
    try {
        const user = await User.findOne({ discordId: discordId }).exec();
        return user;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

async function findOrCreateUser(discordId, authCode, discordUsername, avatarUrl, accessToken, refreshToken, expiresAt) {
    let user = undefined;
    try {
        user = await getUser(discordId);
		if(!user) throw "User not found";
    } catch (error) {
        const newUser = new User({
            discordId: discordId,
			authCode: authCode,
            userName: discordUsername,
			avatarUrl: avatarUrl,
			accessToken: accessToken,
			refreshToken: refreshToken,
			expiresAt: expiresAt,
            lastLogin: Date.now(),
        });
        user = await newUser.save();
    }
    return user;
}

async function findUserWithCode(authCode)
{
	let user = undefined;
	try {
		user = await User.findOne({authCode: authCode});
	} catch(error) {
		console.error(`Failed to find user with code: ${authCode}`);
	}
	return user;
}

async function updateUser(discordId, authCode, discordUsername, avatarUrl, accessToken, refreshToken, expiresAt) {
    let user = undefined;
    try {
		user = User.findOneAndUpdate(
			{ discordID: discordId },
            {
				$set: {
					authCode: authCode,
					userName: discordUsername,
					avatarUrl: avatarUrl,
					accessToken: accessToken,
					refreshToken: refreshToken,
					expiresAt: expiresAt,
                    lastLogin: Date.now(),
                },
            },
            {
				upsert: true,
                new: true,
                runValidators: true,
            }
        ).exec();
	} catch (error) {
		console.log(error);
    }
	return user;
}

module.exports = {
    connect,
    findOrCreateUser,
	findUserWithCode,
    updateUser,
};