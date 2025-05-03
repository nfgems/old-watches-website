// scripts/fetch-ebay-listings.js
const axios = require('axios');
const fs = require('fs');
const { parseString } = require('xml2js');

// Add detailed logging for debugging
console.log('Starting eBay listings fetch script');

// eBay API configuration
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_SELLER_ID = process.env.EBAY_SELLER_ID || 'honey_suckle';
const USE_SANDBOX = false;

console.log(`Using seller ID: ${EBAY_SELLER_ID}`);
console.log(`Using sandbox: ${USE_SANDBOX}`);

// eBay API endpoints
const FINDING_API_URL = USE_SANDBOX
  ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
  : 'https://svcs.ebay.com/services/search/FindingService/v1';

// Helper function to delay execution (for rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch listings with retry logic
async function fetchSellerListingsWithRetry(maxRetries = 3, initialDelay = 5000) {
  let retries = 0;
  let backoffDelay = initialDelay;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Fetching listings for seller: ${EBAY_SELLER_ID} (Attempt ${retries + 1}/${maxRetries + 1})`);
      
      // Use the Finding API with findItemsAdvanced operation
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
      <findItemsAdvancedRequest xmlns="http://www.ebay.com/marketplace/search/v1/services">
        <itemFilter>
          <name>Seller</name>
          <value>${EBAY_SELLER_ID}</value>
        </itemFilter>
        <paginationInput>
          <entriesPerPage>50</entriesPerPage>
          <pageNumber>1</pageNumber>
        </paginationInput>
        <sortOrder>EndTimeSoonest</sortOrder>
      </findItemsAdvancedRequest>`;
      
      const response = await axios({
        method: 'post',
        url: FINDING_API_URL,
        headers: {
          'Content-Type': 'text/xml',
          'X-EBAY-SOA-SECURITY-APPNAME': EBAY_APP_ID,
          'X-EBAY-SOA-OPERATION-NAME': 'findItemsAdvanced',
          'X-EBAY-SOA-GLOBAL-ID': 'EBAY-US',
          'X-EBAY-SOA-REQUEST-DATA-FORMAT': 'XML',
          'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'XML'
        },
        data: xmlPayload
      });
      
      console.log('Successfully received Finding API response');
      
      // Process XML response
      return processApiResponse(response.data);
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

// Function to process Finding API response
async function processApiResponse(xmlData) {
  return new Promise((resolve, reject) => {
    parseString(xmlData, (err, result) => {
      if (err) {
        console.error('Error parsing XML response:', err);
        reject(err);
        return;
      }
      
      try {
        // Check for errors
        if (result.findItemsAdvancedResponse && result.findItemsAdvancedResponse[0].errors) {
          const errors = result.findItemsAdvancedResponse[0].errors;
          console.error('API returned errors:', JSON.stringify(errors, null, 2));
          resolve({ itemSummaries: [] });
          return;
        }
        
        // Check if we have search results
        if (!result.findItemsAdvancedResponse || 
            !result.findItemsAdvancedResponse[0].searchResult || 
            !result.findItemsAdvancedResponse[0].searchResult[0]) {
          console.log('No search results found in response');
          resolve({ itemSummaries: [] });
          return;
        }
        
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
          // Extract image URL
          let imageUrl = 'https://placehold.co/600x400/gold/white?text=No+Image';
          if (item.galleryURL && item.galleryURL[0]) {
            imageUrl = item.galleryURL[0];
          }
          
          // Extract price
          let price = { value: '0.00', currency: 'USD' };
          if (item.sellingStatus && item.sellingStatus[0] && item.sellingStatus[0].currentPrice) {
            price = {
              value: item.sellingStatus[0].currentPrice[0].__,
              currency: item.sellingStatus[0].currentPrice[0].$.currencyId
            };
          }
          
          // Create specifics array
          const specifics = [];
          
          // Add condition if available
          if (item.condition && item.condition[0] && item.condition[0].conditionDisplayName) {
            specifics.push({
              name: 'Condition',
              value: item.condition[0].conditionDisplayName[0]
            });
          }
          
          // Add category name
          if (item.primaryCategory && item.primaryCategory[0] && item.primaryCategory[0].categoryName) {
            specifics.push({
              name: 'Category',
              value: item.primaryCategory[0].categoryName[0]
            });
          }
          
          // Add listing type
          if (item.listingInfo && item.listingInfo[0] && item.listingInfo[0].listingType) {
            specifics.push({
              name: 'Listing Type',
              value: item.listingInfo[0].listingType[0]
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
      {
        itemId: '987654321',
        title: 'Rolex Datejust 36mm Stainless Steel - Box and Papers',
        image: {
          imageUrl: 'https://i.ebayimg.com/images/g/13cAAOSwD2NjmO2I/s-l1600.jpg'
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
          imageUrl: 'https://i.ebayimg.com/images/g/CswAAOSwpHtgEV5w/s-l1600.jpg'
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
