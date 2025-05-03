// app.js
document.addEventListener('DOMContentLoaded', () => {
  const listingsContainer = document.getElementById('listings-container');
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  
  // Fetch the pre-generated JSON file with eBay listings
  fetchListingsFromJson()
    .then(renderListings)
    .catch(handleError);
  
  // Function to fetch listings from the pre-generated JSON file
  async function fetchListingsFromJson() {
    try {
      const response = await fetch('listings.json');
      if (!response.ok) {
        throw new Error('Failed to fetch listings data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching listings JSON:', error);
      
      // Fall back to mock data if listings.json is not available
      console.log('Falling back to mock data...');
      return fetchMockListings();
    }
  }
  
  // Backup function to fetch mock listings (used if listings.json is not available)
  async function fetchMockListings() {
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
        // Your existing mock data can remain as a fallback
        // ... (other mock items)
      ]
    };
  }
  
  // Function to render listings on the page
  function renderListings(data) {
    loadingMessage.style.display = 'none';
    
    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      errorMessage.textContent = 'No listings found';
      errorMessage.style.display = 'block';
      return;
    }
    
    // Clear any existing listings
    listingsContainer.innerHTML = '';
    
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
    
    // Add a timestamp to show when the data was last updated
    const timestamp = document.createElement('div');
    timestamp.className = 'update-timestamp';
    timestamp.innerHTML = `<p>Listings last updated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>`;
    listingsContainer.after(timestamp);
  }
  
  // Error handling function
  function handleError(error) {
    console.error('Error:', error);
    loadingMessage.style.display = 'none';
    errorMessage.textContent = 'Unable to load listings. Please try again later.';
    errorMessage.style.display = 'block';
  }
});
