const express = require('express');
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const db = require('./utils/db');
const { generateToken, authenticateToken } = require('./utils/jwt');

const app = express();
const PORT = process.env.PORT || 3000;

db.connect(
    conn => {
        run(conn);
    },
    error => {
        console.log(error);
    }
);

function onAuthError(res, error) {
    console.error(error);
    return res.json({ error: error });
}

function onAuthSuccess(res, user) {
    console.log(JSON.stringify(user));
    return res.json(user);
}

async function run(conn) {
    if (!conn) {
        console.error('FATAL: Failed to connect to database!');
        return;
    }

    console.log('Successfully connected to database!');

    app.get(
        '/auth/:authCode',
        authenticateToken(db, onAuthSuccess, onAuthError)
    );

    app.get('/login', (req, res) => {
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
            response_type: 'code',
            scope: 'identify guilds guilds.members.read',
        });
        res.redirect(
            `https://discord.com/api/oauth2/authorize?${params.toString()}`
        );
    });

    app.get('/', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.redirect('/login');

        try {
            // Exchange code for access token
            const tokenResponse = await axios.post(
                'https://discord.com/api/oauth2/token',
                new URLSearchParams({
                    client_id: process.env.DISCORD_CLIENT_ID,
                    client_secret: process.env.DISCORD_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: process.env.DISCORD_REDIRECT_URI,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            const accessToken = tokenResponse.data.access_token;

            // Fetch user info
            const userResponse = await axios.get(
                'https://discord.com/api/users/@me',
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const userId = userResponse.data.id;
            const userName = userResponse.data.username;
            const avatarHash = userResponse.data.avatar;
            const avatarSize = process.env.DISCORD_AVATAR_SIZE || 512;
            const extension =
                avatarHash && avatarHash.startsWith('a_') ? 'gif' : 'png';
            const avatarUrl = avatarHash
                ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${avatarSize}`
                : null;

            // Fetch guild member info
            const memberResponse = await axios.get(
                `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            const roles = memberResponse.data.roles;

            if (!roles.includes(process.env.DISCORD_ROLE_ID)) {
                return res
                    .status(403)
                    .send('Access denied: Missing required role');
            }

            // Generate JWT
            const refreshToken = generateToken({ userId });
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour = 60 * 60 * 1000 (60 seconds * 60 minutes * 1000 milliseconds)
            let user = await db.findOrCreateUser(
                userId,
                code,
                userName,
                avatarUrl,
                accessToken,
                refreshToken,
                expiresAt
            );

            //res.json({discordId: user.discordId, userName: user.userName, avatarUrl: user.avatarUrl, refreshToken: user.refreshToken});
            res.redirect(`/login/${code}`);
        } catch (error) {
            console.error(
                'Authentication error:',
                error.response?.data || error.message
            );
            res.status(500).send('Authentication failed');
        }
    });

    app.use(express.static(path.join(__dirname, 'public')));
    
    app.get('/login/success', (req, res) => {
        const filePath = path.join(__dirname, 'public', 'login', 'success', 'index.html');
        res.sendFile(filePath);
    });

    app.get('/login/:authCode', (req, res) => {
        const filePath = path.join(__dirname, 'public', 'login', 'auth', 'index.html');
        res.sendFile(filePath);
    });


    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}