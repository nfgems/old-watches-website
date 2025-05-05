// app.js
document.addEventListener('DOMContentLoaded', () => {
  const listingsContainer = document.getElementById('listings-container');
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const categoryButtons = document.querySelectorAll('.category-button');
  const sortSelect = document.getElementById('sort-select');
  const backToTopButton = document.getElementById('back-to-top');
  
  // Add view toggle buttons
  const horizontalViewBtn = document.getElementById('horizontal-view-btn');
  const gridViewBtn = document.getElementById('grid-view-btn');
  
  // Add search elements
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const clearSearchButton = document.getElementById('clear-search');
  const searchResultsInfo = document.getElementById('search-results-info');
  const searchCount = document.getElementById('search-count');
  const resetSearchButton = document.getElementById('reset-search');
  
  let allListings = []; // Store all listings for filtering
  let currentCategory = 'all'; // Track current category filter
  let currentSort = 'default'; // Track current sort option
  let currentView = 'horizontal'; // Track current view mode (horizontal or grid)
  let currentSearch = ''; // Track current search text
  
  // Initialize view from localStorage or default to horizontal
  initializeView();
  
  // Fetch the pre-generated JSON file with eBay listings
  fetchListingsFromJson()
    .then(data => {
      allListings = data;
      renderListings(data);
      setupCategoryFilters();
      setupSortFilter();
      setupViewToggle(); // Add view toggle functionality
      setupSearch(); // Add search functionality
    })
    .catch(handleError);
  
  // Function to initialize view based on localStorage
  function initializeView() {
    // Try to get saved view preference
    const savedView = localStorage.getItem('oldWatchesViewMode');
    if (savedView) {
      currentView = savedView;
      
      // Set the correct toggle button as active
      if (currentView === 'grid') {
        horizontalViewBtn.classList.remove('active');
        gridViewBtn.classList.add('active');
        listingsContainer.classList.add('grid-view');
        listingsContainer.classList.remove('horizontal-view');
      } else {
        horizontalViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        listingsContainer.classList.add('horizontal-view');
        listingsContainer.classList.remove('grid-view');
      }
    } else {
      // Default to horizontal view
      listingsContainer.classList.add('horizontal-view');
    }
  }
  
  // Function to setup search functionality
  function setupSearch() {
    // Search button click handler
    searchButton.addEventListener('click', () => {
      performSearch();
    });
    
    // Enter key press in search input
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
    
    // Clear search button
    clearSearchButton.addEventListener('click', () => {
      searchInput.value = '';
      currentSearch = '';
      clearSearchButton.style.display = 'none';
      searchResultsInfo.style.display = 'none';
      applyFiltersAndSort();
    });
    
    // Reset search button
    resetSearchButton.addEventListener('click', () => {
      searchInput.value = '';
      currentSearch = '';
      clearSearchButton.style.display = 'none';
      searchResultsInfo.style.display = 'none';
      applyFiltersAndSort();
    });
    
    // Show/hide clear button based on search input content
    searchInput.addEventListener('input', () => {
      clearSearchButton.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    });
  }
  
  // Function to perform search
  function performSearch() {
    currentSearch = searchInput.value.trim().toLowerCase();
    
    if (currentSearch.length > 0) {
      clearSearchButton.style.display = 'block';
    } else {
      clearSearchButton.style.display = 'none';
      searchResultsInfo.style.display = 'none';
    }
    
    applyFiltersAndSort();
  }
  
  // Function to setup view toggle
  function setupViewToggle() {
    horizontalViewBtn.addEventListener('click', () => {
      if (currentView !== 'horizontal') {
        // Update active button
        horizontalViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        
        // Update view classes
        listingsContainer.classList.add('horizontal-view');
        listingsContainer.classList.remove('grid-view');
        
        // Update cards to horizontal layout
        const cards = document.querySelectorAll('.listing-card');
        cards.forEach(card => {
          card.classList.add('horizontal');
        });
        
        // Save preference
        currentView = 'horizontal';
        localStorage.setItem('oldWatchesViewMode', currentView);
      }
    });
    
    gridViewBtn.addEventListener('click', () => {
      if (currentView !== 'grid') {
        // Update active button
        gridViewBtn.classList.add('active');
        horizontalViewBtn.classList.remove('active');
        
        // Update view classes
        listingsContainer.classList.add('grid-view');
        listingsContainer.classList.remove('horizontal-view');
        
        // Remove horizontal class from cards
        const cards = document.querySelectorAll('.listing-card');
        cards.forEach(card => {
          card.classList.remove('horizontal');
        });
        
        // Save preference
        currentView = 'grid';
        localStorage.setItem('oldWatchesViewMode', currentView);
      }
    });
  }
  
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
  
  // Enhanced mock listings function with manual/digital/quartz watch data
  async function fetchMockListings() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return categorized mock data
    return {
      itemSummaries: [
        {
          itemId: '123456789',
          title: 'Vintage Omega Seamaster Automatic Watch - 1940s',
          image: {
            imageUrl: 'https://placehold.co/600x400/b29059/fff?text=Omega+Seamaster'
          },
          price: {
            value: '3875.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/123456789',
          shortDescription: 'Rare 1940s Omega Seamaster in excellent condition. Features a beautiful automatic movement.',
          fullDescription: 'Rare 1940s Omega Seamaster in excellent condition. Features a beautiful automatic movement. This exceptional timepiece showcases Omega\'s commitment to precision with its 17-jewel automatic caliber. The watch retains its original dial with minimal aging that adds to its vintage charm. The 35mm stainless steel case shows signs of authentic wear consistent with its age. A perfect addition to any collection of antique manual watches.',
          specifics: [
            { name: 'Brand', value: 'Omega' },
            { name: 'Model', value: 'Seamaster' },
            { name: 'Year', value: '1940s' },
            { name: 'Movement', value: 'Automatic' },
            { name: 'Type', value: 'Manual' },
            { name: 'Listing Date', value: '2025-04-15' }
          ]
        },
        {
          itemId: '223344556',
          title: 'Vintage Heuer Chronograph Ref. 7143 - Pre-War Manual Wind',
          image: {
            imageUrl: 'https://placehold.co/600x400/b29059/fff?text=Heuer+Chronograph'
          },
          price: {
            value: '9850.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/223344556',
          shortDescription: 'Beautiful Pre-War Heuer Chronograph in original unpolished condition. Features the early manual wind movement.',
          fullDescription: 'Beautiful Pre-War Heuer Chronograph in original unpolished condition. Features the early manual wind movement from 1939. This is a rare opportunity to acquire one of Heuer\'s most significant historical models in remarkably preserved condition. This example features its original black dial with applied gold numerals, showing a beautiful gentle patina. The case remains unpolished, retaining its original proportions and factory finishing. The movement has been recently serviced and is keeping excellent time.',
          specifics: [
            { name: 'Brand', value: 'Heuer' },
            { name: 'Model', value: 'Chronograph' },
            { name: 'Reference', value: '7143' },
            { name: 'Year', value: '1939' },
            { name: 'Type', value: 'Manual' },
            { name: 'Movement', value: 'Manual Wind' },
            { name: 'Listing Date', value: '2025-04-20' }
          ]
        },
        {
          itemId: '987654321',
          title: 'Casio G-Shock DW-5600C-1V - Original 90s Digital Model',
          image: {
            imageUrl: 'https://placehold.co/600x400/ff5987/fff?text=G-Shock+Digital'
          },
          price: {
            value: '699.99',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/987654321',
          shortDescription: 'The original DW-5600C from the early 90s as featured in action movies. Excellent condition with all original parts.',
          fullDescription: 'The original DW-5600C from the early 90s as featured in action movies. Excellent condition with all original parts. This is the highly sought-after model, named for its appearance in the iconic 1994 action film. The DW-5600C is considered by collectors to be the holy grail of G-Shocks, representing the purest expression of the original 1983 design ethos, updated for the 90s with the addition of the iconic Protection bezel. This example is in exceptional condition with a clean, scratch-free crystal and crisp LCD display. All functions work perfectly, including the backlight, alarm, and stopwatch. The original rubber strap shows minimal wear and remains flexible. Comes complete with original box, manual, and warranty card.',
          specifics: [
            { name: 'Brand', value: 'Casio' },
            { name: 'Model', value: 'G-Shock DW-5600C' },
            { name: 'Year', value: '1992' },
            { name: 'Type', value: 'Digital' },
            { name: 'Movement', value: 'Quartz Digital' },
            { name: 'Listing Date', value: '2025-04-01' }
          ]
        },
        {
          itemId: '564738291',
          title: 'Seiko Ana-Digi H357 "James Bond" - New Old Stock 80s',
          image: {
            imageUrl: 'https://placehold.co/600x400/ff5987/fff?text=Seiko+Ana-Digi'
          },
          price: {
            value: '1249.99',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/564738291',
          shortDescription: 'New Old Stock Seiko Ana-Digi H357 from 1982. Still sealed in original packaging. The iconic James Bond watch!',
          fullDescription: 'New Old Stock Seiko Ana-Digi H357 from 1982. Still sealed in original packaging. This is the iconic James Bond watch worn in several films of the early 80s. This is a true time capsule example, never worn and still sealed in its original Seiko packaging with price tag. The watch features both analog hands and a digital display, world time, daily alarm, and chronograph functions. Made famous by numerous appearances in 80s pop culture, this particular variant is the most desirable gold model with rectangular case, exactly as appeared in popular media. A perfect addition to any vintage technology collection or for the nostalgic enthusiast looking to wear a pristine example of this iconic timepiece.',
          specifics: [
            { name: 'Brand', value: 'Seiko' },
            { name: 'Model', value: 'H357 Ana-Digi' },
            { name: 'Year', value: '1982' },
            { name: 'Type', value: 'Digital' },
            { name: 'Condition', value: 'New Old Stock' },
            { name: 'Listing Date', value: '2025-03-15' }
          ]
        },
        {
          itemId: '112233445',
          title: 'LeCoultre Military Issue - British Army WWII',
          image: {
            imageUrl: 'https://placehold.co/600x400/b29059/fff?text=LeCoultre+Military'
          },
          price: {
            value: '4250.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/112233445',
          shortDescription: 'Rare British Army issued LeCoultre from World War II. Features special military markings on the caseback.',
          fullDescription: 'Rare British Army issued LeCoultre from World War II. Features special military markings on the caseback. This extremely rare military-issued LeCoultre from 1943 was specifically produced for the British Army during WWII. The caseback bears the distinct broad arrow marking used to denote British military property, along with military issue numbers and year of issue. The dial features luminous radium numerals and hands that have aged to a beautiful patina. The 35mm stainless steel case shows the honest wear expected of a watch that served in wartime conditions, with each mark telling part of its unique history. Accompanied by extensive military service documentation tracing its history from issuance to a British Army officer in 1943.',
          specifics: [
            { name: 'Brand', value: 'LeCoultre' },
            { name: 'Model', value: 'Military Issue' },
            { name: 'Year', value: '1943' },
            { name: 'Type', value: 'Manual' },
            { name: 'Provenance', value: 'British Army' },
            { name: 'Listing Date', value: '2025-05-01' }
          ]
        },
        {
          itemId: '667788991',
          title: 'Pulsar P2 Digital LED - Original 1970s Space Age',
          image: {
            imageUrl: 'https://placehold.co/600x400/ff5987/fff?text=Pulsar+LED'
          },
          price: {
            value: '6349.99',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/667788991',
          shortDescription: 'Iconic Pulsar P2 LED digital watch from the 1970s. The first digital electronic watch ever made.',
          fullDescription: 'Iconic Pulsar P2 LED digital watch from the 1970s. The first digital electronic watch ever made. This is the groundbreaking model that changed watchmaking forever, introduced in 1972 as the world\'s first all-electronic digital watch. With its futuristic red LED display that only shows the time when the button is pressed (to save battery life), the Pulsar was considered the ultimate luxury tech item of its era, worn by celebrities and even U.S. Presidents. This example is in excellent condition with its original 18k gold-filled case and bracelet. All electronics work perfectly, with the signature bright red display illuminating crisply when activated. Complete with original box and papers, this is a rare opportunity to own a pivotal piece of horological history.',
          specifics: [
            { name: 'Brand', value: 'Pulsar' },
            { name: 'Model', value: 'P2 LED' },
            { name: 'Year', value: '1972' },
            { name: 'Type', value: 'Digital' },
            { name: 'Style', value: 'LED Display' },
            { name: 'Listing Date', value: '2025-04-10' }
          ]
        },
        {
          itemId: '889977665',
          title: 'Seiko SKX007 Automatic Dive Watch',
          image: {
            imageUrl: 'https://placehold.co/600x400/4a90e2/fff?text=Seiko+SKX007'
          },
          price: {
            value: '349.99',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/889977665',
          shortDescription: 'Classic Seiko SKX007 dive watch. Excellent condition with original box and papers.',
          fullDescription: 'Classic Seiko SKX007 dive watch in excellent condition with original box and papers. This iconic diver features the reliable 7S26 automatic movement, a unidirectional rotating bezel, and 200m of water resistance. The 42mm case sits perfectly on the wrist with the Jubilee bracelet. The black dial with luminous markers is in pristine condition with no scratches or blemishes. A perfect everyday watch with a rich heritage of quality and reliability.',
          specifics: [
            { name: 'Brand', value: 'Seiko' },
            { name: 'Model', value: 'SKX007' },
            { name: 'Year', value: '2019' },
            { name: 'Type', value: 'Quartz' },
            { name: 'Water Resistance', value: '200m' },
            { name: 'Listing Date', value: '2025-04-05' }
          ]
        }
      ]
    };
  }
  
  // Setup sort filter
  function setupSortFilter() {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      applyFiltersAndSort();
    });
  }
  
  // Setup category filter buttons
  function setupCategoryFilters() {
    categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get the category value
        currentCategory = button.getAttribute('data-category');
        
        // Apply filters and sorting
        applyFiltersAndSort();
      });
    });
  }
  
  // Apply filters, search, and sorting
  function applyFiltersAndSort() {
    loadingMessage.style.display = 'none';
    
    if (!allListings || !allListings.itemSummaries || allListings.itemSummaries.length === 0) {
      errorMessage.textContent = 'No listings found';
      errorMessage.style.display = 'block';
      return;
    }
    
    // First, filter by category
    let filteredListings = [];
    
    if (currentCategory === 'all') {
      filteredListings = [...allListings.itemSummaries];
    } else {
      filteredListings = allListings.itemSummaries.filter(item => {
        // Check if the item has specifics and at least one specific contains the category
        if (!item.specifics) return false;
        
        // First check for Type specific
        const typeSpecific = item.specifics.find(spec => spec.name === 'Type');
        if (typeSpecific && typeSpecific.value.toLowerCase() === currentCategory.toLowerCase()) {
          return true;
        }
        
        // For digital category
        if (currentCategory.toLowerCase() === 'digital' && 
           (item.title.toLowerCase().includes('digital') || 
            item.title.toLowerCase().includes('ana-digi') ||
            item.title.toLowerCase().includes('casio') ||
            item.title.toLowerCase().includes('ana digi'))) {
          return true;
        }
        
        // For manual category
        if (currentCategory.toLowerCase() === 'manual' && 
            (item.title.toLowerCase().includes('manual') ||
             item.title.toLowerCase().includes('rolex') ||
             item.title.toLowerCase().includes('rolco') ||
             item.title.toLowerCase().includes('cartier') ||
             item.title.toLowerCase().includes('military') ||
             item.title.toLowerCase().includes('elgin') || 
             item.title.toLowerCase().includes('waltham') || 
             item.title.toLowerCase().includes('illinois'))) {
          return true;
        }
        
        // For quartz category - if not digital or manual and doesn't contain specific brands
        if (currentCategory.toLowerCase() === 'quartz') {
          const title = item.title.toLowerCase();
          // Check if it doesn't contain any of the excluded terms
          const hasDigitalTerms = title.includes('digital') || 
                                 title.includes('ana-digi') || 
                                 title.includes('ana digi');
          const hasManualTerms = title.includes('manual') ||
                                title.includes('rolex') ||
                                title.includes('rolco') ||
                                title.includes('cartier') ||
                                title.includes('military') ||
                                title.includes('elgin') || 
                                title.includes('bulova') || 
                                title.includes('waltham') || 
                                title.includes('illinois');
          
          // If it doesn't have any of the excluded terms, it falls under quartz
          return !hasDigitalTerms && !hasManualTerms;
        }
        
        return false;
      });
    }
    
    // Then, apply search filter if there is a search term
    if (currentSearch.length > 0) {
      filteredListings = filteredListings.filter(item => {
        // Search in title
        if (item.title.toLowerCase().includes(currentSearch)) {
          return true;
        }
        
        // Search in description
        if (item.shortDescription && item.shortDescription.toLowerCase().includes(currentSearch)) {
          return true;
        }
        
        if (item.fullDescription && item.fullDescription.toLowerCase().includes(currentSearch)) {
          return true;
        }
        
        // Search in specifics
        if (item.specifics && item.specifics.length > 0) {
          return item.specifics.some(spec => 
            spec.value.toLowerCase().includes(currentSearch) || 
            spec.name.toLowerCase().includes(currentSearch)
          );
        }
        
        return false;
      });
      
      // Update search results info
      if (filteredListings.length === 0) {
        searchCount.textContent = 'No watches found for your search.';
      } else if (filteredListings.length === 1) {
        searchCount.textContent = '1 watch found for your search.';
      } else {
        searchCount.textContent = `${filteredListings.length} watches found for your search.`;
      }
      
      searchResultsInfo.style.display = 'flex';
    } else {
      searchResultsInfo.style.display = 'none';
    }
    
    // Then, apply sorting
    const sortedListings = sortListings(filteredListings, currentSort);
    
    // Clear listings container
    listingsContainer.innerHTML = '';
    
    if (sortedListings.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      
      if (currentSearch.length > 0) {
        noResults.textContent = `No watches found matching "${currentSearch}"`;
      } else {
        noResults.textContent = `No watches found in the "${currentCategory}" category.`;
      }
      
      listingsContainer.appendChild(noResults);
      return;
    }
    
    // Render the filtered and sorted listings
    renderListingsArray(sortedListings);
  }
  
  // Sort listings based on selected option
  function sortListings(listings, sortOption) {
    const listingsCopy = [...listings]; // Create a copy to avoid modifying original data
    
    switch (sortOption) {
      case 'price-asc':
        return listingsCopy.sort((a, b) => parseFloat(a.price.value) - parseFloat(b.price.value));
      
      case 'price-desc':
        return listingsCopy.sort((a, b) => parseFloat(b.price.value) - parseFloat(a.price.value));
      
      case 'default':
      default:
        return listingsCopy; // Return unsorted
    }
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
    
    // Render all listings
    renderListingsArray(data.itemSummaries);
    
    // Add a timestamp to show when the data was last updated
    const timestamp = document.createElement('div');
    timestamp.className = 'update-timestamp';
    timestamp.innerHTML = `<p>Listings last updated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>`;
    listingsContainer.after(timestamp);
  }
  
  // Function to render an array of listings
  function renderListingsArray(listings) {
    listings.forEach(item => {
      // Determine the category of the watch (manual, digital, or quartz)
      let category = determineWatchCategory(item);
      
      const card = document.createElement('div');
      // Add horizontal class if current view is horizontal
      card.className = `listing-card ${category} ${currentView === 'horizontal' ? 'horizontal' : ''}`;
      
      // Get the main image or use placeholder
      let imageUrl = '';
      if (category === 'manual') {
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/b29059/fff?text=Manual+Watch';
      } else if (category === 'digital') {
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/ff5987/fff?text=Digital+Watch';
      } else { // quartz
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/4a90e2/fff?text=Quartz+Watch';
      }
      
      // Format specifics if available, excluding Type and Listing Date which we don't want to display
      let specificsHtml = '';
      if (item.specifics && item.specifics.length > 0) {
        specificsHtml = item.specifics
          .filter(spec => spec.name !== 'Type' && spec.name !== 'Listing Date') // Don't show Type or Listing Date
          .map(spec => 
            `<p><strong>${spec.name}:</strong> ${spec.value}</p>`
          ).join('');
      }
      
      // Generate unique IDs for this listing's description elements
      const descriptionId = `desc-${item.itemId}`;
      const readMoreId = `read-more-${item.itemId}`;
      const readLessId = `read-less-${item.itemId}`;
      
      // Create the short description and full description elements
      const shortDescription = item.shortDescription || '';
      const fullDescription = item.fullDescription || item.shortDescription || '';
      
      // Highlight search terms if there is a search query
      let highlightedTitle = item.title;
      let highlightedShortDesc = shortDescription;
      let highlightedFullDesc = fullDescription;
      let highlightedSpecifics = specificsHtml;
      
      if (currentSearch.length > 0) {
        const regex = new RegExp(`(${currentSearch})`, 'gi');
        highlightedTitle = highlightedTitle.replace(regex, '<span class="search-highlight">$1</span>');
        highlightedShortDesc = highlightedShortDesc.replace(regex, '<span class="search-highlight">$1</span>');
        highlightedFullDesc = highlightedFullDesc.replace(regex, '<span class="search-highlight">$1</span>');
        highlightedSpecifics = highlightedSpecifics.replace(regex, '<span class="search-highlight">$1</span>');
      }
      
      // Get category display name
      const categoryDisplayName = getCategoryDisplayName(category);
      
      // Create HTML for item card with category badge and read more/less functionality
      card.innerHTML = `
        <div class="category-badge ${category}">${categoryDisplayName}</div>
        <div class="listing-image">
          <img src="${imageUrl}" alt="${item.title}">
        </div>
        <div class="listing-details">
          <h2>${highlightedTitle}</h2>
          <p class="price">${item.price.value} ${item.price.currency}</p>
          <div class="item-specifics">
            <div class="description-short" id="${descriptionId}">
              <p>${highlightedShortDesc}</p>
              <a href="#" class="read-more-link" id="${readMoreId}">Read more</a>
            </div>
            <div class="description-full" style="display: none;">
              <p>${highlightedFullDesc}</p>
              <a href="#" class="read-less-link" id="${readLessId}">Read less</a>
            </div>
            ${highlightedSpecifics}
          </div>
          <a href="${item.itemWebUrl}" class="view-button" target="_blank">View on eBay</a>
        </div>
      `;
      
      listingsContainer.appendChild(card);
      
      // Add event listeners for read more/less functionality
      document.getElementById(readMoreId)?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById(descriptionId).style.display = 'none';
        document.getElementById(descriptionId).nextElementSibling.style.display = 'block';
      });
      
      document.getElementById(readLessId)?.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById(descriptionId).style.display = 'block';
        document.getElementById(descriptionId).nextElementSibling.style.display = 'none';
      });
    });
    
    // Scroll to top when applying filters/search
    if (currentSearch.length > 0 || currentCategory !== 'all' || currentSort !== 'default') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
  
  // Function to determine watch category (manual, digital, or quartz)
  function determineWatchCategory(item) {
    const title = item.title.toLowerCase();
    
    // Check for digital first
    if (title.includes('digital') || 
        title.includes('ana-digi') || 
        title.includes('ana digi')) {
      return 'digital';
    }
    
    // Then check for manual watches - including Rolex, Rolco, Cartier, Military, and existing brands
    if (title.includes('manual') || 
        title.includes('rolex') ||
        title.includes('rolco') ||
        title.includes('cartier') ||
        title.includes('military') ||
        title.includes('elgin') || 
        title.includes('waltham') || 
        title.includes('illinois')) {
      return 'manual';
    }
    
    // Otherwise, categorize as quartz
    return 'quartz';
  }
  
  // Function to get display name for category
  function getCategoryDisplayName(category) {
    switch(category) {
      case 'manual':
        return 'Manual';
      case 'digital':
        return 'Digital';
      case 'quartz':
        return 'Quartz';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  
  // Error handling function
  function handleError(error) {
    console.error('Error:', error);
    loadingMessage.style.display = 'none';
    errorMessage.textContent = 'Unable to load listings. Please try again later.';
    errorMessage.style.display = 'block';
  }
  
  // Back to top button functionality
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTopButton.classList.add('visible');
    } else {
      backToTopButton.classList.remove('visible');
    }
  });
  
  backToTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});
