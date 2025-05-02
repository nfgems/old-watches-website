// scripts/fetch-ebay-listings.js
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');

// eBay API configuration
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;
const EBAY_SELLER_ID = process.env.EBAY_SELLER_ID || 'honey_suckle';
const USE_SANDBOX = true; // Set to false when ready for production

// eBay API endpoints
const BASE_URL = USE_SANDBOX 
  ? 'https://api.sandbox.ebay.com' 
  : 'https://api.ebay.com';
const AUTH_URL = `${BASE_URL}/identity/v1/oauth2/token`;
const BROWSE_API_URL = `${BASE_URL}/buy/browse/v1`;

// Function to get OAuth token
async function getOAuthToken() {
  try {
    const response = await axios({
      method: 'post',
      url: AUTH_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64')}`
      },
      data: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting OAuth token:', error.message);
    throw error;
  }
}

// Function to fetch listings for a specific seller
async function fetchSellerListings(token) {
  try {
    // Search for items from the specified seller
    const response = await axios({
      method: 'get',
      url: `${BROWSE_API_URL}/item_summary/search`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      },
      params: {
        q: `seller:${EBAY_SELLER_ID}`,
        limit: 50,
        filter: 'conditions:{NEW|USED|EXCELLENT|VERY_GOOD|GOOD|ACCEPTABLE}',
        sort: 'newlyListed'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching seller listings:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Function to enhance listings with additional item details
async function enhanceListings(token, listings) {
  const enhancedListings = [];
  
  for (const item of listings.itemSummaries.slice(0, 20)) { // Limit to 20 items to reduce API calls
    try {
      // Get detailed item information
      const response = await axios({
        method: 'get',
        url: `${BROWSE_API_URL}/item/${item.itemId}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });
      
      // Add additional details to the listing
      const enhancedItem = {
        ...item,
        shortDescription: response.data.shortDescription || response.data.description || '',
        specifics: []
      };
      
      // Extract item specifics if available
      if (response.data.localizedAspects) {
        enhancedItem.specifics = response.data.localizedAspects.map(aspect => ({
          name: aspect.name,
          value: aspect.value
        }));
      }
      
      enhancedListings.push(enhancedItem);
      
      // Slow down API requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error enhancing item ${item.itemId}:`, error.message);
      // Still add the basic item without the enhanced details
      enhancedListings.push(item);
    }
  }
  
  return {
    ...listings,
    itemSummaries: enhancedListings
  };
}

// Main function
async function main() {
  try {
    // Get OAuth token
    const token = await getOAuthToken();
    
    // Fetch listings from the seller
    const listings = await fetchSellerListings(token);
    
    if (!listings.itemSummaries || listings.itemSummaries.length === 0) {
      console.log('No listings found for the seller');
      // Create an empty listings file
      fs.writeFileSync('listings.json', JSON.stringify({ itemSummaries: [] }));
      return;
    }
    
    console.log(`Found ${listings.itemSummaries.length} listings`);
    
    // Enhance listings with additional details
    const enhancedListings = await enhanceListings(token, listings);
    
    // Save to JSON file
    fs.writeFileSync('listings.json', JSON.stringify(enhancedListings, null, 2));
    
    console.log('Successfully saved listings to listings.json');
  } catch (error) {
    console.error('Main error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
