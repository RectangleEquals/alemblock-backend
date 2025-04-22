const jwt = require('jsonwebtoken');

function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function authenticateToken(db, onSuccess, onError) {
    return async function (req, res) {
        if (!db)
            return onError(res, 'Invalid Connection');

        if (!req.params || !req.params.authCode)
            return onError(res, 'Bad Request');

        const authCode = req.params.authCode;
        const user = await db.findUserWithCode(authCode);
        if (!user)
            return onError(res, 'Unknown User');

        await jwt.verify(user.refreshToken, process.env.JWT_SECRET, (err, user) => {
            console.log('Verifying user...');
            if (err)
                return onError(res, `Invalid Token! (${err})`);
            
            console.log('Authorized!');
            req.user = {
                discordId: user.discordId,
                userName: user.userName,
                avatarUrl: user.avatarUrl,
                refreshToken: user.refreshToken,
            };
            return onSuccess(res, req.user);
        });
    };
}

module.exports = { generateToken, authenticateToken };