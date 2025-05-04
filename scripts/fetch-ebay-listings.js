// scripts/fetch-ebay-listings.js
const axios = require('axios');
const fs = require('fs');

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
const BROWSE_API_URL = 'https://api.ebay.com/buy/browse/v1';
const FINDING_API_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';

// Helper function to delay execution (for rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main function to fetch all listings with pagination support
async function fetchAllSellerListings(maxRetries = 3, initialDelay = 5000) {
  let allListings = [];
  let offset = 0;
  const limit = 50; // Maximum allowed by eBay API
  let hasMorePages = true;
  
  console.log('Starting to fetch all listings with pagination');
  
  while (hasMorePages) {
    try {
      const results = await fetchSellerListingsPage(offset, limit, maxRetries, initialDelay);
      
      if (!results || !results.itemSummaries || results.itemSummaries.length === 0) {
        console.log('No more results found or empty response');
        hasMorePages = false;
        break;
      }
      
      console.log(`Fetched ${results.itemSummaries.length} listings from offset ${offset}`);
      allListings = allListings.concat(results.itemSummaries);
      
      // Check if we need to fetch more pages
      if (results.total && offset + limit < results.total) {
        offset += limit;
        console.log(`Moving to next page, offset: ${offset}`);
        // Add a delay between pagination requests to avoid rate limiting
        await delay(1000);
      } else {
        hasMorePages = false;
      }
    } catch (error) {
      console.error('Error during pagination:', error.message);
      hasMorePages = false;
    }
  }
  
  console.log(`Total listings fetched: ${allListings.length}`);
  return { itemSummaries: allListings };
}

// Function to fetch a single page of listings
async function fetchSellerListingsPage(offset = 0, limit = 50, maxRetries = 3, initialDelay = 5000) {
  let retries = 0;
  let backoffDelay = initialDelay;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Fetching listings for seller: ${EBAY_SELLER_ID} (Page offset: ${offset}, Attempt ${retries + 1}/${maxRetries + 1})`);
      
      if (!oauthToken) {
        console.error('OAuth token is required for Browse API. Please complete the OAuth flow.');
        return createMockData();
      }
      
      // Set up headers with OAuth token
      const headers = {
        'Authorization': `Bearer ${oauthToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type': 'application/json'
      };
      
      // Log the headers being sent (excluding any sensitive info)
      const logHeaders = {...headers};
      if (logHeaders['Authorization']) {
        logHeaders['Authorization'] = 'Bearer [REDACTED]';
      }
      console.log('Request headers:', JSON.stringify(logHeaders, null, 2));
      
      // UPDATED: Broader search query with multiple terms and proper encoding
      const queryParams = {
        q: encodeURIComponent("watch OR Cartier"),  // Properly encoded with OR operator
        filter: encodeURIComponent(`sellers:{${EBAY_SELLER_ID}}`),
        limit: limit,
        offset: offset,
        fieldgroups: 'FULL'
      };
      
      // Log the query parameters
      console.log('Query parameters:', JSON.stringify(queryParams, null, 2));
      
      // Make the API request
      const response = await axios({
        method: 'get',
        url: `${BROWSE_API_URL}/item_summary/search`,
        headers: headers,
        params: queryParams
      });
      
      console.log('Successfully received Browse API response');
      console.log(`Total results reported by API: ${response.data.total || 'unknown'}`);
      
      return response.data;
      
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
        
        if (isAuthError && retries < maxRetries) {
          console.log('Authentication error. OAuth token may be expired. Try refreshing the token.');
          // Don't reset OAuth token here as Browse API requires OAuth
          retries++;
          await delay(backoffDelay);
          backoffDelay *= 2;
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

// Function to fetch full item details using Browse API
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
        
        // Set up headers with OAuth token
        const headers = {
          'Authorization': `Bearer ${oauthToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        };
        
        // Make the request to get item details
        const response = await axios({
          method: 'get',
          url: `${BROWSE_API_URL}/item/${itemId}`,
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

// Process Browse API response - enhanced to include auction format info and handle ended listings
async function processBrowseApiResponse(apiResponse) {
  try {
    // Check if we have items
    if (!apiResponse || !apiResponse.itemSummaries || apiResponse.itemSummaries.length === 0) {
      console.log('No items found in Browse API response');
      return { itemSummaries: [] };
    }
    
    const items = apiResponse.itemSummaries;
    console.log(`Found ${items.length} items from seller`);
    
    // Extract item IDs for fetching full details
    const itemIds = items.map(item => item.itemId);
    
    // Fetch full item details - this is optional as the Browse API's search 
    // with fieldgroups=FULL already returns most details we need
    const fullDetails = await fetchFullItemDetails(itemIds);
    console.log(`Fetched full details for ${fullDetails.length} items`);
    
    // Create lookup map for full details
    const detailsMap = {};
    fullDetails.forEach(detail => {
      if (detail && detail.itemId) {
        detailsMap[detail.itemId] = detail;
      }
    });
    
    // Process items to match the old response format expected by app.js
    const processedItems = items.map(item => {
      try {
        // Get item ID
        const itemId = item.itemId;
        
        // Get full details if available
        const fullDetail = detailsMap[itemId];
        
        // Check if listing has ended
        const hasEnded = item.itemEndDate ? new Date(item.itemEndDate) < new Date() : false;
        
        // Skip ended listings
        if (hasEnded) {
          console.log(`Skipping ended listing: ${item.title} (${itemId})`);
          return null;
        }
        
        // Extract image URL
        let imageUrl = 'https://placehold.co/600x400/gold/white?text=No+Image';
        if (item.image && item.image.imageUrl) {
          imageUrl = item.image.imageUrl;
        }
        // Try to use larger image if available in full details
        if (fullDetail && fullDetail.image && fullDetail.image.imageUrl) {
          imageUrl = fullDetail.image.imageUrl;
        }
        
        // Extract price
        let price = { value: 'N/A', currency: 'USD' };
        if (item.price) {
          price = {
            value: item.price.value,
            currency: item.price.currency
          };
        }
        
        // Create specifics array from item aspects
        const specifics = [];
        
        // Add listing format (Auction vs Buy It Now)
        if (item.buyingOptions) {
          specifics.push({
            name: 'Listing Format',
            value: item.buyingOptions.includes('AUCTION') ? 'Auction' : 'Buy It Now'
          });
        }
        
        // Add condition if available
        if (item.condition) {
          specifics.push({
            name: 'Condition',
            value: item.condition
          });
        }
        
        // Add category if available
        if (item.categories && item.categories.length > 0) {
          specifics.push({
            name: 'Category',
            value: item.categories[0].categoryName
          });
        }
        
        // Add item specifics from full details if available
        if (fullDetail && fullDetail.localizedAspects) {
          fullDetail.localizedAspects.forEach(aspect => {
            specifics.push({
              name: aspect.name,
              value: aspect.value
            });
          });
        }
        
        // Add auction end time if applicable
        if (item.buyingOptions && item.buyingOptions.includes('AUCTION') && item.itemEndDate) {
          specifics.push({
            name: 'Auction End Date',
            value: new Date(item.itemEndDate).toLocaleString()
          });
        }
        
        // Add bid count if it's an auction
        if (item.bidCount !== undefined) {
          specifics.push({
            name: 'Current Bids',
            value: item.bidCount.toString()
          });
        }
        
        // Get description from full details or create a short description
        let fullDescription = '';
        let shortDescription = '';
        
        if (fullDetail && fullDetail.description) {
          fullDescription = fullDetail.description;
          // Create a plain text version of the HTML description for short description
          const textDesc = fullDescription.replace(/<[^>]*>/g, '');
          shortDescription = textDesc.substring(0, 200) + (textDesc.length > 200 ? '...' : '');
        } else if (item.shortDescription) {
          shortDescription = item.shortDescription;
        } else if (item.title) {
          // If no description is available, use the title as a fallback
          shortDescription = `${item.title}. ${item.condition || ''}`;
        }
        
        return {
          itemId,
          title: item.title,
          image: { imageUrl },
          price,
          itemWebUrl: item.itemWebUrl || `https://www.ebay.com/itm/${itemId}`,
          shortDescription,
          fullDescription,
          specifics
        };
      } catch (itemError) {
        console.error('Error processing item:', itemError);
        return null;
      }
    }).filter(item => item !== null);
    
    console.log(`Processed ${processedItems.length} active listings (filtered out ${items.length - processedItems.length} ended listings)`);
    
    return { itemSummaries: processedItems };
  } catch (error) {
    console.error('Error processing Browse API results:', error);
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

// Main function - updated to use pagination
async function main() {
  try {
    // Fetch ALL listings with pagination support
    const listings = await fetchAllSellerListings();
    
    if (!listings || !listings.itemSummaries || listings.itemSummaries.length === 0) {
      console.log('No listings found for the seller, using mock data');
      // Create a fallback listings file with mock data
      const mockData = createMockData();
      fs.writeFileSync('listings.json', JSON.stringify(mockData, null, 2));
      return;
    }
    
    // Process the listings to include full details and filter ended listings
    const processedListings = await processBrowseApiResponse(listings);
    console.log(`Successfully processed ${processedListings.itemSummaries.length} listings`);
    
    // Save to JSON file
    fs.writeFileSync('listings.json', JSON.stringify(processedListings, null, 2));
    
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
