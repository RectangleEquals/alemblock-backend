const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const { generateToken, authenticateToken } = require('./utils/jwt');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/auth', authenticateToken, (req, res) => {
	res.json({ message: `Hello ${req.user.userId}, you have been authorized!` });
});

app.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds guilds.members.read',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
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
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userId = userResponse.data.id;

    // Fetch guild member info
    const memberResponse = await axios.get(
      `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const roles = memberResponse.data.roles;

    if (!roles.includes(process.env.DISCORD_ROLE_ID)) {
      return res.status(403).send('Access denied: Missing required role');
    }

    // Generate JWT
    const token = generateToken({ userId });

    // Send token to client (e.g., via redirect or JSON response)
    res.json({ token });
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
