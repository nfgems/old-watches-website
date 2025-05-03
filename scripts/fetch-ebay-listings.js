// scripts/fetch-ebay-listings.js
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');
const { parseString } = require('xml2js'); // Add this package for XML parsing

// Add detailed logging for debugging
console.log('Starting eBay listings fetch script');

// eBay API configuration
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;
const EBAY_SELLER_ID = process.env.EBAY_SELLER_ID || 'honey_suckle';
const USE_SANDBOX = false; // Set to false when ready for production

console.log(`Using seller ID: ${EBAY_SELLER_ID}`);
console.log(`Using sandbox: ${USE_SANDBOX}`);

// eBay API endpoints
const BASE_URL = USE_SANDBOX 
  ? 'https://api.sandbox.ebay.com' 
  : 'https://api.ebay.com';
const AUTH_URL = `${BASE_URL}/identity/v1/oauth2/token`;
const FINDING_API_URL = USE_SANDBOX
  ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
  : 'https://svcs.ebay.com/services/search/FindingService/v1';

// Function to get OAuth token
async function getOAuthToken() {
  try {
    console.log('Attempting to get OAuth token...');
    
    // Explicitly include the basic scope
    const response = await axios({
      method: 'post',
      url: AUTH_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64')}`
      },
      data: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });
    
    console.log('Successfully received OAuth token');
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting OAuth token:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

// Function to fetch listings for a specific seller using the Finding API
async function fetchSellerListings() {
  try {
    console.log(`Fetching listings for seller: ${EBAY_SELLER_ID}`);
    
    // Create the XML payload for the Finding API
    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
    <findItemsAdvancedRequest xmlns="http://www.ebay.com/marketplace/search/v1/services">
      <sellerUserNames>${EBAY_SELLER_ID}</sellerUserNames>
      <paginationInput>
        <entriesPerPage>50</entriesPerPage>
        <pageNumber>1</pageNumber>
      </paginationInput>
      <sortOrder>StartTimeNewest</sortOrder>
    </findItemsAdvancedRequest>`;
    
    // Make the request to the Finding API
    const response = await axios({
      method: 'post',
      url: FINDING_API_URL,
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-SOA-SECURITY-APPNAME': EBAY_APP_ID,
        'X-EBAY-SOA-OPERATION-NAME': 'findItemsAdvanced',
        'X-EBAY-SOA-GLOBAL-ID': 'EBAY-US'
      },
      data: xmlPayload
    });
    
    console.log('Successfully received Finding API response');
    
    // Process XML response
    return new Promise((resolve, reject) => {
      parseString(response.data, (err, result) => {
        if (err) {
          console.error('Error parsing XML response:', err);
          reject(err);
          return;
        }
        
        try {
          // Extract the item data
          const searchResult = result.findItemsAdvancedResponse[0].searchResult[0];
          const count = parseInt(searchResult.$.count, 10);
          
          console.log(`Found ${count} items from seller`);
          
          if (count === 0) {
            resolve({ itemSummaries: [] });
            return;
          }
          
          // Process items to match the format expected by the frontend
          const items = searchResult.item || [];
          const processedItems = items.map(item => {
            // Extract image URL (get the largest one if available)
            let imageUrl = 'https://placehold.co/600x400/gold/white?text=No+Image';
            if (item.galleryURL && item.galleryURL[0]) {
              imageUrl = item.galleryURL[0];
            }
            if (item.pictureURLLarge && item.pictureURLLarge[0]) {
              imageUrl = item.pictureURLLarge[0];
            }
            if (item.pictureURLSuperSize && item.pictureURLSuperSize[0]) {
              imageUrl = item.pictureURLSuperSize[0];
            }
            
            // Extract price
            const price = {
              value: item.sellingStatus[0].currentPrice[0].__,
              currency: item.sellingStatus[0].currentPrice[0].$.currencyId
            };
            
            // Create specifics array
            const specifics = [];
            
            // Add condition if available
            if (item.condition && item.condition[0].conditionDisplayName) {
              specifics.push({
                name: 'Condition',
                value: item.condition[0].conditionDisplayName[0]
              });
            }
            
            // Add listing type
            if (item.listingInfo && item.listingInfo[0].listingType) {
              specifics.push({
                name: 'Listing Type',
                value: item.listingInfo[0].listingType[0]
              });
            }
            
            // Add category name
            if (item.primaryCategory && item.primaryCategory[0].categoryName) {
              specifics.push({
                name: 'Category',
                value: item.primaryCategory[0].categoryName[0]
              });
            }
            
            return {
              itemId: item.itemId[0],
              title: item.title[0],
              image: { imageUrl },
              price,
              itemWebUrl: item.viewItemURL[0],
              shortDescription: item.subtitle ? item.subtitle[0] : '',
              specifics
            };
          });
          
          resolve({ itemSummaries: processedItems });
        } catch (error) {
          console.error('Error processing API results:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching seller listings:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Fetch listings directly (no need for OAuth token with Finding API, uses App ID directly)
    const listings = await fetchSellerListings();
    
    if (!listings.itemSummaries || listings.itemSummaries.length === 0) {
      console.log('No listings found for the seller');
      // Create an empty listings file
      fs.writeFileSync('listings.json', JSON.stringify({ itemSummaries: [] }));
      return;
    }
    
    console.log(`Successfully processed ${listings.itemSummaries.length} listings`);
    
    // Save to JSON file
    fs.writeFileSync('listings.json', JSON.stringify(listings, null, 2));
    
    console.log('Successfully saved listings to listings.json');
  } catch (error) {
    console.error('Main error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
