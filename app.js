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
  const searchSuggestionsEl = document.getElementById('search-suggestions');
  
  let allListings = []; // Store all listings for filtering
  let currentCategory = 'all'; // Track current category filter
  let currentSort = 'default'; // Track current sort option
  let currentView = 'horizontal'; // Track current view mode (horizontal or grid)
  let currentSearch = ''; // Track current search text
  let searchTimeout = null; // For debouncing search input
  let searchSuggestions = []; // Store the current search suggestions
  let selectedSuggestionIndex = -1; // Track selected suggestion
  
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
  
  // Helper function to escape HTML
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (match) => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[match];
    });
  }
  
  // Helper function for highlighting search terms safely
  function highlightSearchTerms(text, searchTerm) {
    if (!text) return '';
    if (!searchTerm || searchTerm.length === 0) return escapeHTML(text);
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const segments = text.split(regex);
    
    return segments.map(segment => {
      if (segment.toLowerCase() === searchTerm.toLowerCase()) {
        return `<span class="search-highlight">${escapeHTML(segment)}</span>`;
      }
      return escapeHTML(segment);
    }).join('');
  }
  
  // Helper function to determine watch category - used by multiple functions
  function getWatchCategory(item) {
    // First check for type in the specifics (more reliable)
    if (item.specifics) {
      const typeSpecific = item.specifics.find(spec => spec.name === 'Type');
      if (typeSpecific) {
        const type = typeSpecific.value.toLowerCase();
        if (['manual', 'automatic', 'digital', 'quartz'].includes(type)) {
          return type;
        }
      }
    }
    
    // Fall back to title-based detection
    const title = item.title.toLowerCase();
    
    // Check for automatic first
    if (title.includes('automatic')) {
      return 'automatic';
    }
    
    // Then check for digital
    if (title.includes('digital') || 
        title.includes('ana-digi') || 
        title.includes('casio') || 
        title.includes('ana digi')) {
      return 'digital';
    }
    
    // Then check for manual watches
    if (title.includes('manual') || 
        title.includes('rolex') ||
        title.includes('rolco') ||
        title.includes('cartier') ||
        title.includes('military') ||
        title.includes('elgin') || 
        title.includes('bulova') || 
        title.includes('waltham') || 
        title.includes('illinois')) {
      return 'manual';
    }
    
    // Otherwise, categorize as quartz
    return 'quartz';
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
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < searchSuggestions.length) {
          // If a suggestion is selected, use that suggestion
          searchInput.value = searchSuggestions[selectedSuggestionIndex].text;
        }
        performSearch();
        hideSearchSuggestions();
      } else if (e.key === 'ArrowDown') {
        // Navigate down through suggestions
        e.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, searchSuggestions.length - 1);
        highlightSelectedSuggestion();
      } else if (e.key === 'ArrowUp') {
        // Navigate up through suggestions
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        highlightSelectedSuggestion();
      } else if (e.key === 'Escape') {
        hideSearchSuggestions();
      }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchSuggestionsEl.contains(e.target)) {
        hideSearchSuggestions();
      }
    });
    
    // Clear search button
    clearSearchButton.addEventListener('click', () => {
      resetSearch();
      hideSearchSuggestions();
    });
    
    // Reset search button
    resetSearchButton.addEventListener('click', () => {
      resetSearch();
      hideSearchSuggestions();
    });
    
    // Debounced search on input
    searchInput.addEventListener('input', () => {
      clearSearchButton.style.display = searchInput.value.length > 0 ? 'block' : 'none';
      
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Set a new timeout for 300ms delay
      searchTimeout = setTimeout(() => {
        const input = searchInput.value.trim().toLowerCase();
        if (input.length > 1) { // Only suggest if > 1 character
          showSearchSuggestions(input);
        } else {
          hideSearchSuggestions();
          if (input.length === 0 && currentSearch.length > 0) {
            // Reset if field is cleared
            resetSearch();
          }
        }
      }, 300);
    });
  }
  
  // Function to reset search
  function resetSearch() {
    searchInput.value = '';
    currentSearch = '';
    clearSearchButton.style.display = 'none';
    searchResultsInfo.style.display = 'none';
    applyFiltersAndSort();
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
  
  // Function to generate and show search suggestions
  function showSearchSuggestions(input) {
    if (!allListings || !allListings.itemSummaries) return;
    
    searchSuggestions = [];
    selectedSuggestionIndex = -1;
    
    // Generate suggestions based on titles, brands, and other specifics
    allListings.itemSummaries.forEach(item => {
      // Check title
      if (item.title.toLowerCase().includes(input)) {
        searchSuggestions.push({
          text: item.title,
          category: getWatchCategory(item)
        });
      }
      
      // Check brand, model, year in specifics
      if (item.specifics) {
        const brandSpec = item.specifics.find(spec => spec.name === 'Brand');
        const modelSpec = item.specifics.find(spec => spec.name === 'Model');
        const yearSpec = item.specifics.find(spec => spec.name === 'Year');
        
        if (brandSpec && brandSpec.value.toLowerCase().includes(input)) {
          searchSuggestions.push({
            text: brandSpec.value,
            category: getWatchCategory(item)
          });
        }
        
        if (modelSpec && modelSpec.value.toLowerCase().includes(input)) {
          searchSuggestions.push({
            text: modelSpec.value,
            category: getWatchCategory(item)
          });
        }
        
        if (yearSpec && yearSpec.value.toLowerCase().includes(input)) {
          searchSuggestions.push({
            text: yearSpec.value,
            category: getWatchCategory(item)
          });
        }
      }
    });
    
    // Remove duplicates and limit to 5 suggestions
    searchSuggestions = [...new Map(searchSuggestions.map(item => 
      [item.text, item])).values()].slice(0, 5);
    
    // If we have suggestions, show them
    if (searchSuggestions.length > 0) {
      // Build the suggestions HTML
      searchSuggestionsEl.innerHTML = '';
      searchSuggestions.forEach((suggestion, index) => {
        const div = document.createElement('div');
        div.className = 'search-suggestion';
        div.innerHTML = `
          ${escapeHTML(suggestion.text)}
          <span class="suggestion-category ${suggestion.category}">${getCategoryDisplayName(suggestion.category)}</span>
        `;
        div.addEventListener('click', () => {
          searchInput.value = suggestion.text;
          performSearch();
          hideSearchSuggestions();
        });
        searchSuggestionsEl.appendChild(div);
      });
      
      // Show the suggestions
      searchSuggestionsEl.style.display = 'block';
    } else {
      hideSearchSuggestions();
    }
  }
  
  // Function to hide search suggestions
  function hideSearchSuggestions() {
    searchSuggestionsEl.style.display = 'none';
    selectedSuggestionIndex = -1;
  }
  
  // Function to highlight the selected suggestion
  function highlightSelectedSuggestion() {
    const suggestionItems = document.querySelectorAll('.search-suggestion');
    
    // Remove highlighting from all suggestions
    suggestionItems.forEach(item => {
      item.classList.remove('selected');
    });
    
    // If a suggestion is selected, highlight it
    if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestionItems.length) {
      suggestionItems[selectedSuggestionIndex].classList.add('selected');
      // Update input field with the selected suggestion text
      searchInput.value = searchSuggestions[selectedSuggestionIndex].text;
    }
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
// Enhanced mock listings function with manual/digital/quartz/automatic watch data
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
            imageUrl: 'https://placehold.co/600x400/8a5928/fff?text=Omega+Seamaster'
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
            { name: 'Type', value: 'Automatic' },
            { name: 'Listing Date', value: '2025-04-15' }
          ]
        },
        // Other watch listings from mock data...
        // Note: In production, this would contain all the watches from the mock data
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
    
    let filteredListings = [];
    
    // IMPORTANT: Search always takes priority and ignores category filtering
    if (currentSearch.trim().length > 0) {
      // Start with all listings regardless of category
      filteredListings = allListings.itemSummaries.filter(item => {
        // Search in title
        if (item.title && item.title.toLowerCase().includes(currentSearch)) {
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
            spec.value && spec.value.toLowerCase().includes(currentSearch) || 
            spec.name && spec.name.toLowerCase().includes(currentSearch)
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
      // If no search term, filter by category
      if (currentCategory === 'all') {
        filteredListings = [...allListings.itemSummaries];
      } else {
        filteredListings = allListings.itemSummaries.filter(item => 
          getWatchCategory(item) === currentCategory
        );
      }
      
      searchResultsInfo.style.display = 'none';
    }
    
    // Apply sorting
    const sortedListings = sortListings(filteredListings, currentSort);
    
    // Clear listings container
    listingsContainer.innerHTML = '';
    
    if (sortedListings.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      
      if (currentSearch.length > 0) {
        noResults.textContent = `No watches found matching "${escapeHTML(currentSearch)}"`;
      } else {
        noResults.textContent = `No watches found in the "${getCategoryDisplayName(currentCategory)}" category.`;
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
    const getPrice = (item) => parseFloat(item?.price?.value || 0);
    
    switch (sortOption) {
      case 'price-asc':
        return listingsCopy.sort((a, b) => getPrice(a) - getPrice(b));
      
      case 'price-desc':
        return listingsCopy.sort((a, b) => getPrice(b) - getPrice(a));
      
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
      // Determine the category of the watch
      let category = getWatchCategory(item);
      
      const card = document.createElement('div');
      // Add horizontal class if current view is horizontal
      card.className = `listing-card ${category} ${currentView === 'horizontal' ? 'horizontal' : ''}`;
      
      // Get the main image or use placeholder
      let imageUrl = '';
      if (category === 'manual') {
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/b29059/fff?text=Manual+Watch';
      } else if (category === 'digital') {
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/ff5987/fff?text=Digital+Watch';
      } else if (category === 'automatic') {
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/8a5928/fff?text=Automatic+Watch';
      } else { // quartz
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/4a90e2/fff?text=Quartz+Watch';
      }
      
      // Format specifics if available, excluding Type and Listing Date
      let specificsHtml = '';
      if (item.specifics && item.specifics.length > 0) {
        specificsHtml = item.specifics
          .filter(spec => spec.name !== 'Type' && spec.name !== 'Listing Date')
          .map(spec => 
            `<p><strong>${escapeHTML(spec.name)}:</strong> ${escapeHTML(spec.value)}</p>`
          ).join('');
      }
      
      // Generate unique IDs for this listing's description elements
      const descriptionId = `desc-${item.itemId}`;
      const readMoreId = `read-more-${item.itemId}`;
      const readLessId = `read-less-${item.itemId}`;
      
      // Create the short description and full description elements
      const shortDescription = item.shortDescription || '';
      const fullDescription = item.fullDescription || item.shortDescription || '';
      
      // Apply highlighting safely if there is a search term
      let highlightedTitle = escapeHTML(item.title);
      let highlightedShortDesc = escapeHTML(shortDescription);
      let highlightedFullDesc = escapeHTML(fullDescription);
      let highlightedSpecifics = specificsHtml;
      
      if (currentSearch.length > 0) {
        highlightedTitle = highlightSearchTerms(item.title, currentSearch);
        highlightedShortDesc = highlightSearchTerms(shortDescription, currentSearch);
        highlightedFullDesc = highlightSearchTerms(fullDescription, currentSearch);
        
        // Only highlight in specifics if already generated
        if (specificsHtml && currentSearch.length > 0) {
          const regex = new RegExp(`(${escapeHTML(currentSearch)})`, 'gi');
          highlightedSpecifics = specificsHtml.replace(regex, '<span class="search-highlight">$1</span>');
        }
      }
      
      // Get category display name
      const categoryDisplayName = getCategoryDisplayName(category);
      
      // Create HTML for item card with category badge and read more/less functionality
      card.innerHTML = `
        <div class="category-badge ${category}">${categoryDisplayName}</div>
        <div class="listing-image">
          <img src="${imageUrl}" alt="${escapeHTML(item.title)}">
        </div>
        <div class="listing-details">
          <h2>${highlightedTitle}</h2>
          <p class="price">${item.price ? item.price.value : '0.00'} ${item.price ? item.price.currency : 'USD'}</p>
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
      
      // Add event listeners directly to the elements within this card
      const readMoreLink = card.querySelector(`#${readMoreId}`);
      const readLessLink = card.querySelector(`#${readLessId}`);
      const descriptionElement = card.querySelector(`#${descriptionId}`);
      
      if (readMoreLink) {
        readMoreLink.addEventListener('click', function(e) {
          e.preventDefault();
          descriptionElement.style.display = 'none';
          descriptionElement.nextElementSibling.style.display = 'block';
        });
      }
      
      if (readLessLink) {
        readLessLink.addEventListener('click', function(e) {
          e.preventDefault();
          descriptionElement.style.display = 'block';
          descriptionElement.nextElementSibling.style.display = 'none';
        });
      }
    });
    
    // Scroll to top when applying filters/search
    if (currentSearch.length > 0 || currentCategory !== 'all' || currentSort !== 'default') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
  
  // Function to get display name for category
  function getCategoryDisplayName(category) {
    switch(category) {
      case 'manual':
        return 'Manual';
      case 'automatic':
        return 'Automatic';
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
