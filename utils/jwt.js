const jwt = require('jsonwebtoken');

function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function authenticateToken(db) {
    return async function (req, res, next) {
        if (!db)
            return res.json({ error: 'Invalid Connection' });

        if (!req.params || !req.params.authCode)
            return res.json({ error: 'Bad Request' });

        const authCode = req.params.authCode;
        const user = await db.findUserWithCode(authCode);
        if (!user)
            return res.json({ error: 'Unknown User' });

        await jwt.verify(user.refreshToken, process.env.JWT_SECRET, (err, user) => {
            console.log('Verifying token...');
            if (err) {
                console.error('Invalid Token!');
                return res.json({ error: 'Invalid Token' });
            }
            console.log('Authorized!');
            req.user = {
                discordId: user.discordId,
                userName: user.userName,
                avatarUrl: user.avatarUrl,
                refreshToken: user.refreshToken,
            };
            next();
        });
    };
}

module.exports = { generateToken, authenticateToken };