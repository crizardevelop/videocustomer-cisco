require('dotenv').config();
const axios = require('axios');

async function getAccessToken() {
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    try {
    const response = await axios.post('https://your-auth-provider.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
    });

    const accessToken = response.data.access_token;
    console.log('Access Token:', accessToken);
    return accessToken;
    } catch (error) {
    console.error('Error fetching access token:', error);
    }
}
