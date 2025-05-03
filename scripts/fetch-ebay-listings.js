// scripts/fetch-ebay-listings.js
const axios = require('axios');
const fs = require('fs');
const { parseString } = require('xml2js');

// Add detailed logging for debugging
console.log('Starting eBay listings fetch script');

// eBay API configuration
const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_SELLER_ID = process.env.EBAY_SELLER_ID || 'honey_suckle';

// Try to load OAuth tokens if available
let oauthToken = null;
try {
  if (fs.existsSync('ebay-tokens.json')) {
    const tokensData = JSON.parse(fs.readFileSync('ebay-tokens.json', 'utf8'));
    oauthToken = tokensData.access_token;
    console.log('OAuth token loaded successfully');
  } else {
    console.log('No OAuth tokens file found, falling back to App ID authentication');
  }
} catch (error) {
  console.error('Error loading OAuth tokens:', error.message);
}

console.log(`Using seller ID: ${EBAY_SELLER_ID}`);

// eBay API endpoints
const FINDING_API_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';
const SHOPPING_API_URL = 'https://open.api.ebay.com/shopping';

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
          <entriesPerPage>100</entriesPerPage>
          <pageNumber>1</pageNumber>
        </paginationInput>
        <sortOrder>StartTimeNewest</sortOrder>
        <outputSelector>PictureURLLarge</outputSelector>
        <outputSelector>SellerInfo</outputSelector>
      </findItemsAdvancedRequest>`;
      
      // Set up headers - ALWAYS include the App ID regardless of OAuth usage
      const headers = {
        'Content-Type': 'text/xml',
        'X-EBAY-SOA-OPERATION-NAME': 'findItemsAdvanced',
        'X-EBAY-SOA-GLOBAL-ID': 'EBAY-US',
        'X-EBAY-SOA-REQUEST-DATA-FORMAT': 'XML',
        'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'XML',
        'X-EBAY-SOA-SECURITY-APPNAME': EBAY_APP_ID // Always include App ID
      };
      
      // Add OAuth token if available
      if (oauthToken) {
        headers['Authorization'] = `Bearer ${oauthToken}`;
        console.log('Using OAuth authentication with App ID');
      } else {
        console.log('Using App ID authentication only');
      }
      
      // Log the headers being sent (excluding any sensitive info)
      const logHeaders = {...headers};
      if (logHeaders['Authorization']) {
        logHeaders['Authorization'] = 'Bearer [REDACTED]';
      }
      if (logHeaders['X-EBAY-SOA-SECURITY-APPNAME']) {
        logHeaders['X-EBAY-SOA-SECURITY-APPNAME'] = '[REDACTED]';
      }
      console.log('Request headers:', JSON.stringify(logHeaders, null, 2));
      
      const response = await axios({
        method: 'post',
        url: FINDING_API_URL,
        headers: headers,
        data: xmlPayload
      });
      
      console.log('Successfully received Finding API response');
      
      // Check for error messages in the XML response
      if (response.data && typeof response.data === 'string' && 
          (response.data.includes('<errorMessage') || response.data.includes('<Errors>'))) {
        console.error('API returned an error in XML format:', response.data.substring(0, 500) + '...');
        
        // Parse the error to see if it's an auth issue
        return new Promise((resolve, reject) => {
          parseString(response.data, (err, result) => {
            if (err) {
              console.error('Error parsing XML error response:', err);
              reject(new Error('Failed to parse error response'));
            } else {
              if (result.errorMessage && result.errorMessage.error) {
                const errorDetail = result.errorMessage.error[0];
                console.error('API Error:', JSON.stringify(errorDetail, null, 2));
                
                // Check if it's an auth error and retry with different auth method
                if (errorDetail.domain && errorDetail.domain[0] === 'Security' && oauthToken) {
                  console.log('Authentication error detected. Will retry with App ID only.');
                  oauthToken = null;
                  retries++;
                  throw new Error('Authentication error, retrying with App ID only');
                } else {
                  reject(new Error(`API Error: ${errorDetail.message[0]}`));
                }
              } else {
                reject(new Error('Unknown API error'));
              }
            }
          });
        });
      }
      
      // Process XML response
      return new Promise((resolve, reject) => {
        parseString(response.data, (err, result) => {
          if (err) {
            console.error('Error parsing XML response:', err);
            reject(err);
          } else {
            // Check if the response contains an error message
            if (result.errorMessage || 
               (result.findItemsAdvancedResponse && 
                result.findItemsAdvancedResponse[0] && 
                result.findItemsAdvancedResponse[0].errors)) {
              
              const errorMsg = result.errorMessage ? 
                JSON.stringify(result.errorMessage) : 
                JSON.stringify(result.findItemsAdvancedResponse[0].errors);
              
              console.error('API returned an error:', errorMsg);
              reject(new Error(`API Error: ${errorMsg}`));
            } else {
              resolve(processFindingApiResponse(result));
            }
          }
        });
      });
    } catch (error) {
      console.error(`Error fetching seller listings (Attempt ${retries + 1}/${maxRetries + 1}):`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
        if (error.response.data) {
          // Limit the data log to prevent massive output
          const dataStr = typeof error.response.data === 'string' ? 
            error.response.data : 
            JSON.stringify(error.response.data);
          console.error('Response data (first 1000 chars):', dataStr.substring(0, 1000));
        }
        
        // Check if error is related to rate limiting or authentication
        const isRateLimit = 
          error.response.status === 500 || 
          error.response.status === 429 || 
          (error.response.data && typeof error.response.data === 'string' && 
           error.response.data.includes('RateLimiter'));
        
        const isAuthError = 
          error.response.status === 401 || 
          error.response.status === 403 ||
          (error.response.data && typeof error.response.data === 'string' && 
           (error.response.data.includes('Auth') || 
            error.response.data.includes('credential') ||
            error.response.data.includes('Security')));
        
        if (isRateLimit && retries < maxRetries) {
          console.log(`Rate limit hit. Waiting ${backoffDelay/1000} seconds before retry...`);
          await delay(backoffDelay);
          backoffDelay *= 2; // Exponential backoff
          retries++;
          continue;
        }
        
        if (isAuthError && oauthToken) {
          console.log('Authentication error. OAuth token may be expired or insufficient. Falling back to App ID authentication only.');
          oauthToken = null; // Reset OAuth token to fall back to App ID auth
          retries++;
          continue;
        }
      }
      
      // If we've reached the max retries or the error isn't recoverable
      if (retries >= maxRetries) {
        console.log(`Exhausted all ${maxRetries} retries. Falling back to mock data.`);
        return createMockData();
      }
      
      // Otherwise, increment retries and try again with backoff
      console.log(`Will retry in ${backoffDelay/1000} seconds...`);
      await delay(backoffDelay);
      backoffDelay *= 2; // Exponential backoff
      retries++;
    }
  }
  
  // If we somehow exit the loop without returning, fall back to mock data
  console.log('Falling back to mock data due to unexpected exit from retry loop');
  return createMockData();
}

// Function to fetch full item details including description
async function fetchFullItemDetails(itemIds) {
  console.log(`Fetching full details for ${itemIds.length} items`);
  
  const itemDetails = [];
  
  // Process items in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(itemIds.length/batchSize)}`);
    
    const batchPromises = batch.map(async (itemId) => {
      try {
        console.log(`Fetching details for item ${itemId}`);
        
        // Set up params and headers
        const params = {
          callname: 'GetSingleItem',
          responseencoding: 'JSON',
          siteid: 0,
          version: 967,
          ItemID: itemId,
          IncludeSelector: 'Description,ItemSpecifics',
          appid: EBAY_APP_ID // Always include App ID in params
        };
        
        const headers = {};
        
        // Add OAuth token if available
        if (oauthToken) {
          headers['Authorization'] = `Bearer ${oauthToken}`;
        }
        
        const response = await axios({
          method: 'get',
          url: SHOPPING_API_URL,
          params: params,
          headers: headers
        });
        
        return response.data;
      } catch (error) {
        console.error(`Error fetching details for item ${itemId}:`, error.message);
        if (error.response && error.response.data) {
          console.error('Response data:', typeof error.response.data === 'string' ? 
            error.response.data.substring(0, 500) : 
            JSON.stringify(error.response.data).substring(0, 500));
        }
        return null;
      }
    });
    
    // Wait for all items in batch to complete
    const batchResults = await Promise.all(batchPromises);
    itemDetails.push(...batchResults.filter(result => result !== null));
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < itemIds.length) {
      console.log('Waiting 2 seconds before next batch...');
      await delay(2000);
    }
  }
  
  return itemDetails;
}

// Function to process Finding API response
async function processFindingApiResponse(xmlResult) {
  try {
    // Check if we have items
    const response = xmlResult.findItemsAdvancedResponse;
    
    if (!response || !response[0] || !response[0].searchResult || !response[0].searchResult[0] || 
        !response[0].searchResult[0].item || response[0].searchResult[0].item.length === 0) {
      console.log('No items found in Finding API response');
      return { itemSummaries: [] };
    }
    
    const items = response[0].searchResult[0].item;
    console.log(`Found ${items.length} items from seller`);
    
    // Extract item IDs for fetching full details
    const itemIds = items.map(item => item.itemId[0]);
    
    // Fetch full item details including descriptions
    const fullDetails = await fetchFullItemDetails(itemIds);
    console.log(`Fetched full details for ${fullDetails.length} items`);
    
    // Create lookup map for full details
    const detailsMap = {};
    fullDetails.forEach(detail => {
      if (detail && detail.Item) {
        detailsMap[detail.Item.ItemID] = detail.Item;
      }
    });
    
    const processedItems = items.map(item => {
      try {
        // Get item ID
        const itemId = item.itemId[0];
        
        // Get full details if available
        const fullDetail = detailsMap[itemId];
        
        // Extract image URL
        let imageUrl = 'https://placehold.co/600x400/gold/white?text=No+Image';
        if (item.galleryURL && item.galleryURL[0]) {
          imageUrl = item.galleryURL[0];
        }
        // Try to use larger image if available
        if (item.pictureURLLarge && item.pictureURLLarge[0]) {
          imageUrl = item.pictureURLLarge[0];
        }
        
        // Extract price
        let price = { value: 'N/A', currency: 'USD' };
        if (item.sellingStatus && item.sellingStatus[0] && item.sellingStatus[0].currentPrice && 
            item.sellingStatus[0].currentPrice[0]) {
          price = {
            value: item.sellingStatus[0].currentPrice[0]._,
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
        
        // Add category if available
        if (item.primaryCategory && item.primaryCategory[0] && item.primaryCategory[0].categoryName) {
          specifics.push({
            name: 'Category',
            value: item.primaryCategory[0].categoryName[0]
          });
        }
        
        // Add item specifics from full details if available
        if (fullDetail && fullDetail.ItemSpecifics && fullDetail.ItemSpecifics.NameValueList) {
          fullDetail.ItemSpecifics.NameValueList.forEach(spec => {
            specifics.push({
              name: spec.Name,
              value: Array.isArray(spec.Value) ? spec.Value.join(', ') : spec.Value
            });
          });
        }
        
        // Get description from full details
        let fullDescription = '';
        if (fullDetail && fullDetail.Description) {
          fullDescription = fullDetail.Description;
        }
        
        // Create short description from subtitle or item specifics if available
        let shortDescription = '';
        if (item.subtitle && item.subtitle[0]) {
          shortDescription = item.subtitle[0];
        } else if (fullDescription) {
          // Create a plain text version of the HTML description
          const textDesc = fullDescription.replace(/<[^>]*>/g, '');
          shortDescription = textDesc.substring(0, 200) + (textDesc.length > 200 ? '...' : '');
        }
        
        return {
          itemId,
          title: item.title[0],
          image: { imageUrl },
          price,
          itemWebUrl: item.viewItemURL[0],
          shortDescription,
          fullDescription,
          specifics
        };
      } catch (itemError) {
        console.error('Error processing item:', itemError);
        return null;
      }
    }).filter(item => item !== null);
    
    return { itemSummaries: processedItems };
  } catch (error) {
    console.error('Error processing Finding API results:', error);
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
        fullDescription: '<div>Beautiful Omega Seamaster from the 1960s in excellent condition. Features an automatic movement that has been recently serviced. Comes with original box and papers. The watch shows minimal signs of wear for its age and keeps excellent time.</div>',
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
        fullDescription: '<div>Authentic Rolex Datejust 36mm in stainless steel. This watch comes complete with original box and papers. The watch is in excellent condition with minimal wear. Features include: automatic movement, date function, jubilee bracelet, and stainless steel fluted bezel.</div>',
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
        fullDescription: '<div>Rare Seiko 6139 "Pogue" chronograph in all original condition. This sought-after collector piece is named after Colonel William Pogue who wore this model on the Skylab 4 mission. Features include: automatic movement with chronograph function, day/date display, original bracelet, and the iconic yellow dial. The watch has been serviced and all functions work properly.</div>',
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
    
    if (!listings || !listings.itemSummaries || listings.itemSummaries.length === 0) {
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
