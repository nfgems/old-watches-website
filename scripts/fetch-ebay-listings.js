// scripts/fetch-ebay-listings.js
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');
const { parseString } = require('xml2js');

// Add detailed logging for debugging
console.log('Starting eBay listings fetch script');

// eBay API configuration
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;
const EBAY_SELLER_ID = process.env.EBAY_SELLER_ID || 'honey_suckle';
const USE_SANDBOX = false;

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

// Helper function to delay execution (for rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch listings with retry logic
async function fetchSellerListingsWithRetry(maxRetries = 3, initialDelay = 5000) {
  let retries = 0;
  let backoffDelay = initialDelay;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Fetching listings for seller: ${EBAY_SELLER_ID} (Attempt ${retries + 1}/${maxRetries + 1})`);
      
      // Use the Shopping API instead of Finding API to avoid rate limits
      // This API has higher rate limits and is more suitable for basic seller item lookup
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
      <GetSellerListRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <UserID>${EBAY_SELLER_ID}</UserID>
        <IncludeWatchCount>true</IncludeWatchCount>
        <GranularityLevel>Fine</GranularityLevel>
        <OutputSelector>Item.ItemID</OutputSelector>
        <OutputSelector>Item.Title</OutputSelector>
        <OutputSelector>Item.PictureDetails</OutputSelector>
        <OutputSelector>Item.SellingStatus</OutputSelector>
        <OutputSelector>Item.ListingDetails</OutputSelector>
        <OutputSelector>Item.PrimaryCategory</OutputSelector>
        <OutputSelector>Item.ConditionID</OutputSelector>
        <OutputSelector>Item.ConditionDisplayName</OutputSelector>
      </GetSellerListRequest>`;
      
      const response = await axios({
        method: 'post',
        url: 'https://api.ebay.com/ws/api.dll',
        headers: {
          'X-EBAY-API-CALL-NAME': 'GetSellerList',
          'X-EBAY-API-APP-ID': EBAY_APP_ID,
          'X-EBAY-API-SITE-ID': '0', // US site
          'X-EBAY-API-VERSION': '1199',
          'X-EBAY-API-RESPONSE-ENCODING': 'XML',
          'Content-Type': 'text/xml'
        },
        data: xmlPayload
      });
      
      console.log('Successfully received API response');
      
      // Process XML response
      return await processShoppingApiResponse(response.data);
    } catch (error) {
      console.error(`Error fetching seller listings (Attempt ${retries + 1}/${maxRetries + 1}):`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        
        // Check if error is related to rate limiting
        const isRateLimit = 
          error.response.status === 500 || 
          (error.response.data && error.response.data.includes('RateLimiter'));
        
        if (isRateLimit && retries < maxRetries) {
          console.log(`Rate limit hit. Waiting ${backoffDelay/1000} seconds before retry...`);
          await delay(backoffDelay);
          backoffDelay *= 2; // Exponential backoff
          retries++;
          continue;
        }
      }
      
      // If we reach here, either it's not a rate limit error or we've exhausted retries
      // Fall back to mock data for development/testing
      console.log('Falling back to mock data due to API errors');
      return createMockData();
    }
  }
}

// Function to process Shopping API response
async function processShoppingApiResponse(xmlData) {
  return new Promise((resolve, reject) => {
    parseString(xmlData, (err, result) => {
      if (err) {
        console.error('Error parsing XML response:', err);
        reject(err);
        return;
      }
      
      try {
        // Check for errors
        if (result.GetSellerListResponse && result.GetSellerListResponse.Errors) {
          const errors = result.GetSellerListResponse.Errors;
          console.error('API returned errors:', JSON.stringify(errors, null, 2));
          resolve({ itemSummaries: [] });
          return;
        }
        
        // Extract the item data
        const responseObj = result.GetSellerListResponse;
        if (!responseObj || !responseObj.ItemArray || !responseObj.ItemArray[0] || !responseObj.ItemArray[0].Item) {
          console.log('No items found in response');
          resolve({ itemSummaries: [] });
          return;
        }
        
        const items = responseObj.ItemArray[0].Item || [];
        console.log(`Found ${items.length} items from seller`);
        
        // Process items to match the format expected by the frontend
        const processedItems = items.map(item => {
          // Extract image URL
          let imageUrl = 'https://placehold.co/600x400/gold/white?text=No+Image';
          if (item.PictureDetails && item.PictureDetails[0] && item.PictureDetails[0].PictureURL) {
            imageUrl = item.PictureDetails[0].PictureURL[0];
          }
          
          // Extract price
          let price = { value: '0.00', currency: 'USD' };
          if (item.SellingStatus && item.SellingStatus[0] && item.SellingStatus[0].CurrentPrice) {
            price = {
              value: item.SellingStatus[0].CurrentPrice[0]._,
              currency: item.SellingStatus[0].CurrentPrice[0].$.currencyID
            };
          }
          
          // Create specifics array
          const specifics = [];
          
          // Add condition if available
          if (item.ConditionDisplayName && item.ConditionDisplayName[0]) {
            specifics.push({
              name: 'Condition',
              value: item.ConditionDisplayName[0]
            });
          }
          
          // Add category name
          if (item.PrimaryCategory && item.PrimaryCategory[0] && item.PrimaryCategory[0].CategoryName) {
            specifics.push({
              name: 'Category',
              value: item.PrimaryCategory[0].CategoryName[0]
            });
          }
          
          return {
            itemId: item.ItemID[0],
            title: item.Title[0],
            image: { imageUrl },
            price,
            itemWebUrl: `https://www.ebay.com/itm/${item.ItemID[0]}`,
            shortDescription: '',
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
}

// Function to create mock data for fallback
function createMockData() {
  console.log('Creating mock data');
  return {
    itemSummaries: [
      {
        itemId: '123456789',
        title: 'Vintage Omega Seamaster Automatic Watch - 1960s',
        image: {
          imageUrl: 'https://placehold.co/600x400/gold/white?text=Omega+Watch'
        },
        price: {
          value: '899.99',
          currency: 'USD'
        },
        itemWebUrl: 'https://www.ebay.com/itm/123456789',
        shortDescription: 'Beautiful Omega Seamaster from the 1960s in excellent condition. Automatic movement.',
        specifics: [
          { name: 'Brand', value: 'Omega' },
          { name: 'Model', value: 'Seamaster' },
          { name: 'Year', value: '1960s' },
          { name: 'Condition', value: 'Used - Excellent' }
        ]
      },
      {
        itemId: '987654321',
        title: 'Rolex Datejust 36mm Stainless Steel - Box and Papers',
        image: {
          imageUrl: 'https://placehold.co/600x400/gold/white?text=Rolex+Datejust'
        },
        price: {
          value: '5899.99',
          currency: 'USD'
        },
        itemWebUrl: 'https://www.ebay.com/itm/987654321',
        shortDescription: 'Authentic Rolex Datejust with complete box and papers. Excellent condition.',
        specifics: [
          { name: 'Brand', value: 'Rolex' },
          { name: 'Model', value: 'Datejust' },
          { name: 'Size', value: '36mm' },
          { name: 'Condition', value: 'Used - Very Good' }
        ]
      },
      {
        itemId: '564738291',
        title: 'Vintage Seiko 6139 Chronograph - Pogue - All Original',
        image: {
          imageUrl: 'https://placehold.co/600x400/gold/white?text=Seiko+Pogue'
        },
        price: {
          value: '1299.99',
          currency: 'USD'
        },
        itemWebUrl: 'https://www.ebay.com/itm/564738291',
        shortDescription: 'Rare Seiko 6139 "Pogue" chronograph in all original condition. Sought-after collector piece.',
        specifics: [
          { name: 'Brand', value: 'Seiko' },
          { name: 'Model', value: '6139 Chronograph' },
          { name: 'Year', value: '1970s' },
          { name: 'Condition', value: 'Vintage - Good' }
        ]
      }
    ]
  };
}

// Main function
async function main() {
  try {
    // Fetch listings with retry logic
    const listings = await fetchSellerListingsWithRetry();
    
    if (!listings.itemSummaries || listings.itemSummaries.length === 0) {
      console.log('No listings found for the seller, using empty array');
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
    
    // Even on error, create a mock data file so the website has something to display
    console.log('Creating fallback listings.json with mock data');
    const mockData = createMockData();
    fs.writeFileSync('listings.json', JSON.stringify(mockData, null, 2));
    
    process.exit(1);
  }
}

// Run the main function
main();
