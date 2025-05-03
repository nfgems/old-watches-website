// scripts/refresh-token.js
const axios = require('axios');
const fs = require('fs');

// eBay OAuth config
const CLIENT_ID = process.env.EBAY_APP_ID;
const CLIENT_SECRET = process.env.EBAY_CERT_ID;

async function refreshToken() {
  try {
    // Read the current tokens from the file
    if (!fs.existsSync('ebay-tokens.json')) {
      console.error('No tokens file found. Please authorize first.');
      return null;
    }
    
    const tokensData = JSON.parse(fs.readFileSync('ebay-tokens.json', 'utf8'));
    const refreshToken = tokensData.refresh_token;
    
    if (!refreshToken) {
      console.error('No refresh token found in tokens file.');
      return null;
    }
    
    console.log('Refreshing access token...');
    
    // Request to refresh the token
    // Include the required scopes for Browse API
    const response = await axios({
      method: 'post',
      url: 'https://api.ebay.com/identity/v1/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      data: `grant_type=refresh_token&refresh_token=${refreshToken}&scope=https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/buy.item.feed https://api.ebay.com/oauth/api_scope/buy.marketing https://api.ebay.com/oauth/api_scope/buy.product.feed https://api.ebay.com/oauth/api_scope/buy.marketplace.insights`
    });
    
    const newTokenData = response.data;
    
    // Combine with existing data to keep the refresh token if not returned
    const updatedTokenData = {
      ...tokensData,
      access_token: newTokenData.access_token,
      expires_in: newTokenData.expires_in,
      token_type: newTokenData.token_type
    };
    
    // If a new refresh token is provided, update it
    if (newTokenData.refresh_token) {
      updatedTokenData.refresh_token = newTokenData.refresh_token;
    }
    
    // Save the updated tokens
    fs.writeFileSync('ebay-tokens.json', JSON.stringify(updatedTokenData, null, 2));
    
    const expiresIn = updatedTokenData.expires_in;
    const expirationDate = new Date(Date.now() + expiresIn * 1000);
    console.log(`Token refreshed successfully! Expires on: ${expirationDate.toISOString()}`);
    
    return updatedTokenData;
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the token refresh
refreshToken()
  .then(tokens => {
    if (tokens) {
      console.log('Token refresh complete');
    }
  })
  .catch(error => {
    console.error('Token refresh failed:', error);
    process.exit(1);
  });
