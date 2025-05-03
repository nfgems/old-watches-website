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

// eBay API endpoints - Using the Trading API
const TRADING_API_URL = USE_SANDBOX
  ? 'https://api.sandbox.ebay.com/ws/api.dll'
  : 'https://api.ebay.com/ws/api.dll';

// Helper function to delay execution (for rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch listings with retry logic
async function fetchSellerListingsWithRetry(maxRetries = 3, initialDelay = 5000) {
  let retries = 0;
  let backoffDelay = initialDelay;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Fetching listings for seller: ${EBAY_SELLER_ID} (Attempt ${retries + 1}/${maxRetries + 1})`);
      
      // Use the Trading API with GetSellerList operation
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
      <GetSellerListRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
          <eBayAuthToken>${EBAY_USER_TOKEN}</eBayAuthToken>
        </RequesterCredentials>
        <DetailLevel>ReturnAll</DetailLevel>
        <IncludeWatchCount>true</IncludeWatchCount>
        <Pagination>
          <EntriesPerPage>100</EntriesPerPage>
          <PageNumber>1</PageNumber>
        </Pagination>
        <StartTimeFrom>2010-01-01T00:00:00.000Z</StartTimeFrom>
        <StartTimeTo>2050-01-01T00:00:00.000Z</StartTimeTo>
      </GetSellerListRequest>`;
      
      const response = await axios({
        method: 'post',
        url: TRADING_API_URL,
        headers: {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '1155',
          'X-EBAY-API-CALL-NAME': 'GetSellerList',
          'X-EBAY-API-SITEID': '0', // US site
          'X-EBAY-API-APP-NAME': EBAY_APP_ID
        },
        data: xmlPayload
      });
      
      console.log('Successfully received Trading API response');
      
      // Process XML response
      return new Promise((resolve, reject) => {
        parseString(response.data, (err, result) => {
          if (err) {
            console.error('Error parsing XML response:', err);
            reject(err);
          } else {
            resolve(processTradingApiResponse(result));
          }
        });
      });
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

// Function to process Trading API response
function processTradingApiResponse(xmlResult) {
  try {
    const sellerList = xmlResult.GetSellerListResponse;
    
    if (!sellerList || !sellerList.ItemArray || !sellerList.ItemArray[0] || !sellerList.ItemArray[0].Item) {
      console.log('No items found in Trading API response');
      return { itemSummaries: [] };
    }
    
    const items = sellerList.ItemArray[0].Item;
    console.log(`Found ${items.length} items from seller`);
    
    const processedItems = items.map(item => {
      try {
        // Extract image URL
        let imageUrl = 'https://placehold.co/600x400/gold/white?text=No+Image';
        if (item.PictureDetails && item.PictureDetails[0] && item.PictureDetails[0].PictureURL && item.PictureDetails[0].PictureURL.length > 0) {
          imageUrl = item.PictureDetails[0].PictureURL[0];
        }
        
        // Extract price
        let price = { value: 'N/A', currency: 'USD' };
        if (item.SellingStatus && item.SellingStatus[0] && item.SellingStatus[0].CurrentPrice && item.SellingStatus[0].CurrentPrice.length > 0) {
          price = {
            value: item.SellingStatus[0].CurrentPrice[0]._ || 'N/A',
            currency: item.SellingStatus[0].CurrentPrice[0].$ ? item.SellingStatus[0].CurrentPrice[0].$.currencyID : 'USD'
          };
        }
        
        // Create specifics array
        const specifics = [];
        
        // Add condition if available
        if (item.ConditionDisplayName && item.ConditionDisplayName.length > 0) {
          specifics.push({
            name: 'Condition',
            value: item.ConditionDisplayName[0]
          });
        }
        
        // Add other available details like brand if available in item specifics
        if (item.ItemSpecifics && item.ItemSpecifics[0] && item.ItemSpecifics[0].NameValueList) {
          item.ItemSpecifics[0].NameValueList.forEach(spec => {
            if (spec.Name && spec.Name.length > 0 && spec.Value && spec.Value.length > 0) {
              specifics.push({
                name: spec.Name[0],
                value: spec.Value[0]
              });
            }
          });
        }
        
        // Create URL from item ID
        const itemWebUrl = `https://www.ebay.com/itm/${item.ItemID[0]}`;
        
        return {
          itemId: item.ItemID[0],
          title: item.Title[0],
          image: { imageUrl },
          price,
          itemWebUrl,
          shortDescription: item.Description ? item.Description[0].substring(0, 200) : '',
          specifics
        };
      } catch (itemError) {
        console.error('Error processing item:', itemError);
        return null;
      }
    }).filter(item => item !== null);
    
    return { itemSummaries: processedItems };
  } catch (error) {
    console.error('Error processing Trading API results:', error);
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
        shortDescription: 'Rare Seiko 6139 \"Pogue\" chronograph in all original condition. Sought-after collector piece.',
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
