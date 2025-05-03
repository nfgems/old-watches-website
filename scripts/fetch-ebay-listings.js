// scripts/fetch-ebay-listings.js
const axios = require('axios');
const fs = require('fs');
const { parseString } = require('xml2js');

// Add detailed logging for debugging
console.log('Starting eBay listings fetch script');

// eBay API configuration
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_SELLER_ID = process.env.EBAY_SELLER_ID || 'honey_suckle';
const EBAY_USER_TOKEN = 'v^1.1#i^1#r^1#f^0#p^3#I^3#t^Ul4xMF8xMDpGOERCMTI0MkQwNUI5QjExRUJFNEEwNUU0RDZFODcyN18xXzEjRV4yNjA=';
const USE_SANDBOX = false;

console.log(`Using seller ID: ${EBAY_SELLER_ID}`);
console.log(`Using sandbox: ${USE_SANDBOX}`);

// eBay API endpoints - Using the Browse API instead of Finding API
const BROWSE_API_URL = USE_SANDBOX
  ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
  : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

// Helper function to delay execution (for rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch listings with retry logic
async function fetchSellerListingsWithRetry(maxRetries = 3, initialDelay = 5000) {
  let retries = 0;
  let backoffDelay = initialDelay;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Fetching listings for seller: ${EBAY_SELLER_ID} (Attempt ${retries + 1}/${maxRetries + 1})`);
      
      // Use the Browse API to search for items from a specific seller
      const response = await axios({
        method: 'get',
        url: BROWSE_API_URL,
        headers: {
          'Authorization': `Bearer ${EBAY_USER_TOKEN}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type': 'application/json'
        },
        params: {
          q: '',
          filter: `sellers:{${EBAY_SELLER_ID}}`,
          limit: 50
        }
      });
      
      console.log('Successfully received Browse API response');
      
      // Process JSON response
      return processApiResponse(response.data);
    } catch (error) {
      console.error(`Error fetching seller listings (Attempt ${retries + 1}/${maxRetries + 1}):`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
        if (error.response.data) {
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        // Check if error is related to rate limiting or auth
        const isRateLimit = 
          error.response.status === 500 || 
          error.response.status === 429 || 
          (error.response.data && error.response.data.includes && error.response.data.includes('RateLimiter'));
        
        if (isRateLimit && retries < maxRetries) {
          console.log(`Rate limit hit. Waiting ${backoffDelay/1000} seconds before retry...`);
          await delay(backoffDelay);
          backoffDelay *= 2; // Exponential backoff
          retries++;
          continue;
        }
      }
      
      // If we reach here, either it's not a rate limit error or we've exhausted retries
      console.log('Falling back to mock data due to API errors');
      return createMockData();
    }
  }
}

// Function to process Browse API response
function processApiResponse(apiResponse) {
  try {
    console.log(`Found ${apiResponse.itemSummaries?.length || 0} items from seller`);
    
    if (!apiResponse.itemSummaries || apiResponse.itemSummaries.length === 0) {
      console.log('No items found in response');
      return { itemSummaries: [] };
    }
    
    // Process items to match the format expected by the frontend
    const processedItems = apiResponse.itemSummaries.map(item => {
      // Extract image URL
      let imageUrl = 'https://placehold.co/600x400/gold/white?text=No+Image';
      if (item.image && item.image.imageUrl) {
        imageUrl = item.image.imageUrl;
      }
      
      // Create specifics array
      const specifics = [];
      
      // Add condition if available
      if (item.condition) {
        specifics.push({
          name: 'Condition',
          value: item.condition
        });
      }
      
      // Add other available details
      if (item.brand) {
        specifics.push({
          name: 'Brand',
          value: item.brand
        });
      }
      
      if (item.itemGroupType) {
        specifics.push({
          name: 'Type',
          value: item.itemGroupType
        });
      }
      
      // Make sure all required fields for the frontend are present
      return {
        itemId: item.itemId,
        title: item.title,
        image: { imageUrl },
        price: item.price || { value: 'N/A', currency: 'USD' },
        itemWebUrl: item.itemWebUrl,
        shortDescription: item.shortDescription || item.subtitle || '',
        specifics
      };
    });
    
    return { itemSummaries: processedItems };
  } catch (error) {
    console.error('Error processing API results:', error);
    throw error;
  }
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
          imageUrl: 'https://i.ebayimg.com/images/g/HkQAAOSwaEBjO0iG/s-l1600.jpg'
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
          { name: 'Movement', value: 'Automatic' }
        ]
      },
      // Keep your existing mock data items
      // ...other mock items...
    ]
  };
}

// Main function
async function main() {
  try {
    // Fetch listings with retry logic
    const listings = await fetchSellerListingsWithRetry();
    
    if (!listings.itemSummaries || listings.itemSummaries.length === 0) {
      console.log('No listings found for the seller, using mock data');
      // Create a fallback listings file with mock data
      const mockData = createMockData();
      fs.writeFileSync('listings.json', JSON.stringify(mockData, null, 2));
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
  }
}

// Run the main function
main();
