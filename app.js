// app.js
document.addEventListener('DOMContentLoaded', () => {
  const listingsContainer = document.getElementById('listings-container');
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  
  // For GitHub Pages, we'll use a CORS proxy or a pre-generated JSON file approach
  // Since we can't securely use eBay API directly from the client-side (would expose Client Secret)
  
  // OPTION 1: Use a pre-generated JSON file (recommended for GitHub Pages)
  fetchMockListings()
    .then(renderListings)
    .catch(handleError);
  
  // OPTION 2: (For later implementation with a secure backend)
  // fetchEbayListings()
  //   .then(renderListings)
  //   .catch(handleError);
  
  // Function to fetch mock listings (simulate eBay API response)
  async function fetchMockListings() {
    // This simulates loading from a pre-generated data file
    // In a real implementation, you would update this file periodically
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data that matches eBay API structure
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
            { name: 'Movement', value: 'Automatic' }
          ]
        },
        {
          itemId: '234567890',
          title: 'Antique Pocket Watch - Gold Plated Hunter Case - Working Condition',
          image: {
            imageUrl: 'https://placehold.co/600x400/gold/white?text=Pocket+Watch'
          },
          price: {
            value: '399.50',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/234567890',
          shortDescription: 'Antique pocket watch with gold plated hunter case. Fully serviced and in working condition.',
          specifics: [
            { name: 'Type', value: 'Pocket Watch' },
            { name: 'Case Material', value: 'Gold Plated' },
            { name: 'Style', value: 'Hunter Case' },
            { name: 'Condition', value: 'Working' }
          ]
        },
        {
          itemId: '345678901',
          title: 'Vintage Seiko Chronograph - 1970s Sports Watch - Excellent Condition',
          image: {
            imageUrl: 'https://placehold.co/600x400/gold/white?text=Seiko+Chronograph'
          },
          price: {
            value: '649.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/345678901',
          shortDescription: 'Rare Seiko chronograph from the 1970s. Sports model in excellent condition with original bracelet.',
          specifics: [
            { name: 'Brand', value: 'Seiko' },
            { name: 'Type', value: 'Chronograph' },
            { name: 'Year', value: '1970s' },
            { name: 'Condition', value: 'Excellent' }
          ]
        },
        {
          itemId: '456789012',
          title: 'Vintage Rolex Datejust - Stainless Steel - Jubilee Bracelet',
          image: {
            imageUrl: 'https://placehold.co/600x400/gold/white?text=Rolex+Datejust'
          },
          price: {
            value: '4999.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/456789012',
          shortDescription: 'Classic Rolex Datejust in stainless steel with original jubilee bracelet. Recently serviced.',
          specifics: [
            { name: 'Brand', value: 'Rolex' },
            { name: 'Model', value: 'Datejust' },
            { name: 'Material', value: 'Stainless Steel' },
            { name: 'Bracelet', value: 'Jubilee' }
          ]
        },
        {
          itemId: '567890123',
          title: 'Vintage Hamilton Military Watch - WWII Era - Canvas Strap',
          image: {
            imageUrl: 'https://placehold.co/600x400/gold/white?text=Hamilton+Military'
          },
          price: {
            value: '1299.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/567890123',
          shortDescription: 'Rare WWII era Hamilton military issue watch. Original dial with patina. New canvas strap.',
          specifics: [
            { name: 'Brand', value: 'Hamilton' },
            { name: 'Type', value: 'Military' },
            { name: 'Era', value: 'WWII' },
            { name: 'Strap', value: 'Canvas' }
          ]
        },
        {
          itemId: '678901234',
          title: 'Vintage Universal Geneve Polerouter - Microtor Movement - Original Box',
          image: {
            imageUrl: 'https://placehold.co/600x400/gold/white?text=Universal+Geneve'
          },
          price: {
            value: '2750.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/678901234',
          shortDescription: 'Sought-after Universal Geneve Polerouter with microtor movement. Comes with original box and papers.',
          specifics: [
            { name: 'Brand', value: 'Universal Geneve' },
            { name: 'Model', value: 'Polerouter' },
            { name: 'Movement', value: 'Microtor' },
            { name: 'Extras', value: 'Original Box' }
          ]
        }
      ]
    };
  }
  
  // Function to fetch eBay listings (not used in GitHub Pages version)
  async function fetchEbayListings() {
    // This would be implemented with a secure backend proxy
    // For GitHub Pages, we use the mock data instead
    
    // Example implementation (would require a backend service):
    // const response = await fetch('https://your-backend-proxy.com/ebay-listings');
    // return await response.json();
    
    // Use mock data for now
    return fetchMockListings();
  }
  
  // Function to render listings on the page
  function renderListings(data) {
    loadingMessage.style.display = 'none';
    
    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      errorMessage.textContent = 'No listings found';
      errorMessage.style.display = 'block';
      return;
    }
    
    data.itemSummaries.forEach(item => {
      const card = document.createElement('div');
      card.className = 'listing-card';
      
      // Get the main image or use placeholder
      const imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/gold/white?text=No+Image';
      
      // Format specifics if available
      let specificsHtml = '';
      if (item.specifics && item.specifics.length > 0) {
        specificsHtml = item.specifics.map(spec => 
          `<p><strong>${spec.name}:</strong> ${spec.value}</p>`
        ).join('');
      }
      
      // Create HTML for item card
      card.innerHTML = `
        <div class="listing-image">
          <img src="${imageUrl}" alt="${item.title}">
        </div>
        <div class="listing-details">
          <h2>${item.title}</h2>
          <p class="price">${item.price.value} ${item.price.currency}</p>
          <div class="item-specifics">
            ${item.shortDescription ? `<p>${item.shortDescription}</p>` : ''}
            ${specificsHtml}
          </div>
          <a href="${item.itemWebUrl}" class="view-button" target="_blank">View on eBay</a>
        </div>
      `;
      
      listingsContainer.appendChild(card);
    });
  }
  
  // Error handling function
  function handleError(error) {
    console.error('Error:', error);
    loadingMessage.style.display = 'none';
    errorMessage.style.display = 'block';
  }
});

// For a real implementation, you would add:
// 1. A scheduled GitHub Action to periodically fetch your eBay listings
// 2. Generate a listings.json file with the results
// 3. Use that file instead of the mock data
