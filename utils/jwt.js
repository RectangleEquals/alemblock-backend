const jwt = require('jsonwebtoken');

function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function authenticateToken(db) {
    return function (req, res, next) {
        if(!db)
            return res.json({error: "Invalid connection"});
        
        const authHeader = req.headers['Authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
        console.log(`Handling authorization for token: ${token}`);

        if (!token)
            return res.json({error: "Bad Authorization"});

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            console.log('Verifying token...');
            if (err) {
                console.error('Invalid Token!');
                return res.json({error: "Invalid Token"});
            }
            console.log('Authorized!');
            req.user = user;
            next();
        });
    };
}

module.exports = { generateToken, authenticateToken };
