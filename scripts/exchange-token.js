// scripts/exchange-token.js
const axios = require('axios');
const fs = require('fs');

// The authorization code from the eBay redirect
const authCode = process.argv[2];

// eBay OAuth config
const CLIENT_ID = process.env.EBAY_APP_ID;
const CLIENT_SECRET = process.env.EBAY_CERT_ID;
const REDIRECT_URI = 'https://old.watches/auth-success.html';

async function exchangeCodeForToken() {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    // Define the scopes needed for the Browse API
    const scopes = [
      'https://api.ebay.com/oauth/api_scope',
      'https://api.ebay.com/oauth/api_scope/buy.item.feed',
      'https://api.ebay.com/oauth/api_scope/buy.marketing',
      'https://api.ebay.com/oauth/api_scope/buy.product.feed',
      'https://api.ebay.com/oauth/api_scope/buy.marketplace.insights'
    ].join(' ');
    
    // Prepare the request to exchange the code for tokens
    const response = await axios({
      method: 'post',
      url: 'https://api.ebay.com/identity/v1/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      data: `grant_type=authorization_code&code=${authCode}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`
    });
    
    const tokenData = response.data;
    console.log('Successfully obtained tokens!');
    
    // Create a tokens.json file to store the tokens
    fs.writeFileSync('ebay-tokens.json', JSON.stringify(tokenData, null, 2));
    console.log('Tokens saved to ebay-tokens.json');
    
    // Display token expiration info
    const expiresIn = tokenData.expires_in;
    const expirationDate = new Date(Date.now() + expiresIn * 1000);
    console.log(`Access token will expire on: ${expirationDate.toISOString()}`);
    console.log(`Refresh token: ${tokenData.refresh_token ? 'Available' : 'Not available'}`);
    
    return tokenData;
  } catch (error) {
    console.error('Error exchanging code for token:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the token exchange if an authorization code is provided
if (authCode) {
  exchangeCodeForToken()
    .then(() => {
      console.log('Token exchange complete');
    })
    .catch(error => {
      console.error('Token exchange failed:', error);
      process.exit(1);
    });
} else {
  console.error('No authorization code provided. Usage: node exchange-token.js <authorization_code>');
  process.exit(1);
}
