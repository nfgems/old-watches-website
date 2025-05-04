// app.js
document.addEventListener('DOMContentLoaded', () => {
  const listingsContainer = document.getElementById('listings-container');
  const loadingMessage = document.getElementById('loading-message');
  const errorMessage = document.getElementById('error-message');
  const categoryButtons = document.querySelectorAll('.category-button');
  const sortSelect = document.getElementById('sort-select');
  const backToTopButton = document.getElementById('back-to-top');
  
  let allListings = []; // Store all listings for filtering
  let currentCategory = 'all'; // Track current category filter
  let currentSort = 'default'; // Track current sort option
  
  // Fetch the pre-generated JSON file with eBay listings
  fetchListingsFromJson()
    .then(data => {
      allListings = data;
      renderListings(data);
      setupCategoryFilters();
      setupSortFilter();
    })
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
  
  // Enhanced mock listings function with era-specific watch data
  async function fetchMockListings() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return era-specific mock data
    return {
      itemSummaries: [
        {
          itemId: '123456789',
          title: 'Vintage Rolex Oyster Chronograph Anti-Magnetic Ref. 3525 - WW2 Era',
          image: {
            imageUrl: 'https://placehold.co/600x400/b29059/fff?text=Rolex+3525'
          },
          price: {
            value: '38750.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/123456789',
          shortDescription: 'Rare WW2-era Rolex Oyster Chronograph known as the "Prisoner of War" watch. Issued to British officers during World War II.',
          fullDescription: 'Rare WW2-era Rolex Oyster Chronograph known as the "Prisoner of War" watch. Issued to British officers during World War II. This exceptional timepiece is a Ref. 3525 from circa 1940-1945, featuring an anti-magnetic 17-jewel manual wind movement. The watch retains its original radium dial and hands, with minimal aging that adds to its historical charm. The 35mm stainless steel case shows signs of authentic wear consistent with its military service. These watches were famously sent to British officers in POW camps through the Red Cross, as Rolex founder Hans Wilsdorf believed officers should not have to pay for their watches until after the war. This particular example has documented provenance linking it to a British Royal Air Force officer captured in 1943. The watch comes with full authentication papers and historical documentation.',
          specifics: [
            { name: 'Brand', value: 'Rolex' },
            { name: 'Model', value: 'Oyster Chronograph' },
            { name: 'Reference', value: '3525' },
            { name: 'Year', value: '1940-1945' },
            { name: 'Era', value: 'vintage' },
            { name: 'Movement', value: 'Manual Wind' },
            { name: 'Listing Date', value: '2025-04-15' }
          ]
        },
        {
          itemId: '223344556',
          title: 'Vintage Rolex Bubbleback Ref. 3131 - Pre-WW2 Original Condition',
          image: {
            imageUrl: 'https://placehold.co/600x400/b29059/fff?text=Rolex+Bubbleback'
          },
          price: {
            value: '8950.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/223344556',
          shortDescription: 'Beautiful Pre-WW2 Rolex Bubbleback in original unpolished condition. Features the early 3131 caliber from 1934.',
          fullDescription: 'Beautiful Pre-WW2 Rolex Bubbleback in original unpolished condition. Features the early 3131 caliber from 1934. This is a rare opportunity to acquire one of Rolex\'s most significant historical models in remarkably preserved condition. The Bubbleback (or "Ovetto" in Italian) was one of the first mainstream automatic wristwatches, named for its distinctive rounded caseback designed to accommodate the new automatic movement. This example features its original salmon dial with applied gold numerals, showing a beautiful gentle patina. The case remains unpolished, retaining its original proportions and factory finishing. The movement has been recently serviced and is keeping excellent time. These early Bubblebacks represent an important milestone in Rolex\'s history and the development of the automatic wristwatch.',
          specifics: [
            { name: 'Brand', value: 'Rolex' },
            { name: 'Model', value: 'Bubbleback' },
            { name: 'Reference', value: '3131' },
            { name: 'Year', value: '1934' },
            { name: 'Era', value: 'vintage' },
            { name: 'Movement', value: 'Automatic' },
            { name: 'Listing Date', value: '2025-04-20' }
          ]
        },
        {
          itemId: '987654321',
          title: 'Casio G-Shock DW-5600C-1V - Original 90s "Speed" Model',
          image: {
            imageUrl: 'https://placehold.co/600x400/ff5987/fff?text=G-Shock+Vintage'
          },
          price: {
            value: '699.99',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/987654321',
          shortDescription: 'The original "Speed" DW-5600C from the early 90s as featured in action movies. Excellent condition with all original parts.',
          fullDescription: 'The original "Speed" DW-5600C from the early 90s as featured in action movies. Excellent condition with all original parts. This is the highly sought-after "Speed" model, named for its appearance in the iconic 1994 action film. The DW-5600C is considered by collectors to be the holy grail of G-Shocks, representing the purest expression of the original 1983 design ethos, updated for the 90s with the addition of the iconic Protection bezel. This example is in exceptional condition with a clean, scratch-free crystal and crisp LCD display. All functions work perfectly, including the backlight, alarm, and stopwatch. The original rubber strap shows minimal wear and remains flexible. Comes complete with original box, manual, and warranty card. The DW-5600C models were among the last to be made in Japan before production moved to Thailand, making them particularly desirable to serious collectors.',
          specifics: [
            { name: 'Brand', value: 'Casio' },
            { name: 'Model', value: 'G-Shock DW-5600C' },
            { name: 'Year', value: '1992' },
            { name: 'Era', value: 'nineties' },
            { name: 'Movement', value: 'Quartz' },
            { name: 'Listing Date', value: '2025-04-01' }
          ]
        },
        {
          itemId: '564738291',
          title: 'Casio Databank Calculator Watch CA-53W - New Old Stock 90s',
          image: {
            imageUrl: 'https://placehold.co/600x400/ff5987/fff?text=Casio+Databank'
          },
          price: {
            value: '249.99',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/564738291',
          shortDescription: 'New Old Stock Casio Databank Calculator Watch from 1995. Still sealed in original packaging. The iconic nerd watch of the 90s!',
          fullDescription: 'New Old Stock Casio Databank Calculator Watch from 1995. Still sealed in original packaging. The iconic nerd watch of the 90s! The Casio CA-53W Calculator Watch defined an era and created a cultural archetype. This is a true time capsule example, never worn and still sealed in its original Casio packaging with price tag. The watch features an 8-digit calculator, water resistance, dual time, daily alarm, and 1/100 second stopwatch. Made famous by numerous appearances in 90s pop culture, including being worn by iconic characters in movies and TV shows, the CA-53W became synonymous with computer enthusiasts and tech-forward thinkers of the decade. This particular variant is the most desirable black model with rectangular buttons, exactly as appeared in popular media. A perfect addition to any 90s technology collection or for the nostalgic enthusiast looking to wear a pristine example of this iconic timepiece.',
          specifics: [
            { name: 'Brand', value: 'Casio' },
            { name: 'Model', value: 'Databank CA-53W' },
            { name: 'Year', value: '1995' },
            { name: 'Era', value: 'nineties' },
            { name: 'Condition', value: 'New Old Stock' },
            { name: 'Listing Date', value: '2025-03-15' }
          ]
        },
        {
          itemId: '112233445',
          title: 'Rolex "Compax" Military Issue Ref. 6234 - British Royal Navy WW2',
          image: {
            imageUrl: 'https://placehold.co/600x400/b29059/fff?text=Rolex+Military'
          },
          price: {
            value: '42500.00',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/112233445',
          shortDescription: 'Rare British Royal Navy issued Rolex Chronograph from World War II. Features special military markings on the caseback.',
          fullDescription: 'Rare British Royal Navy issued Rolex Chronograph from World War II. Features special military markings on the caseback. This extremely rare military-issued Rolex Chronograph Ref. 6234 from 1943 was specifically produced for the British Royal Navy during WWII. The caseback bears the distinct broad arrow marking used to denote British military property, along with naval issue numbers and year of issue. The dial features luminous radium numerals and hands that have aged to a beautiful patina, while the original chronograph functions remain crisp and precise. The 36mm stainless steel case shows the honest wear expected of a watch that served in wartime conditions, with each mark telling part of its unique history. Accompanied by extensive military service documentation tracing its history from issuance to a naval officer in 1943 through various deployments. These military issue Rolex chronographs represent some of the rarest and most historically significant timepieces from the era, with very few examples surviving in such complete condition with full documentation.',
          specifics: [
            { name: 'Brand', value: 'Rolex' },
            { name: 'Model', value: 'Compax Chronograph' },
            { name: 'Reference', value: '6234' },
            { name: 'Year', value: '1943' },
            { name: 'Era', value: 'vintage' },
            { name: 'Provenance', value: 'British Royal Navy' },
            { name: 'Listing Date', value: '2025-05-01' }
          ]
        },
        {
          itemId: '667788991',
          title: 'Casio Baby-G BG-169 - Clear Jelly 90s Y2K Aesthetic',
          image: {
            imageUrl: 'https://placehold.co/600x400/ff5987/fff?text=Baby-G+Clear'
          },
          price: {
            value: '349.99',
            currency: 'USD'
          },
          itemWebUrl: 'https://www.ebay.com/itm/667788991',
          shortDescription: 'Iconic clear "jelly" Baby-G from the late 90s. Perfect Y2K aesthetic. Complete with original box and papers.',
          fullDescription: 'Iconic clear "jelly" Baby-G from the late 90s. Perfect Y2K aesthetic. Complete with original box and papers. This is the highly coveted transparent BG-169 model that defined the late 90s fashion aesthetic and has recently seen a massive resurgence in popularity due to Y2K style revival. The clear resin case and band allow full visibility of the internal components, creating the futuristic tech look that characterized the pre-millennium era. This example is in excellent condition with minimal yellowing to the clear resin - a common issue with aged examples. All functions work perfectly including the EL backlight with afterglow, 1/100 second stopwatch, countdown timer, and daily alarm. The watch comes complete with its original translucent box, manual, and warranty card. These transparent Baby-G models were particularly popular among celebrities and appeared in numerous music videos of the era, making them highly collectible pieces of 90s pop culture.',
          specifics: [
            { name: 'Brand', value: 'Casio' },
            { name: 'Model', value: 'Baby-G BG-169' },
            { name: 'Year', value: '1998' },
            { name: 'Era', value: 'nineties' },
            { name: 'Style', value: 'Clear/Transparent' },
            { name: 'Listing Date', value: '2025-04-10' }
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
  
  // Apply both category filtering and sorting
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
        
        return item.specifics.some(spec => 
          (spec.name === 'Era' && spec.value.toLowerCase() === currentCategory.toLowerCase()) ||
          // Also check if brand matches for more flexibility
          ((currentCategory === 'vintage' && spec.name === 'Brand' && spec.value === 'Rolex') ||
           (currentCategory === 'nineties' && spec.name === 'Brand' && spec.value === 'Casio'))
        );
      });
    }
    
    // Then, apply sorting
    const sortedListings = sortListings(filteredListings, currentSort);
    
    // Clear listings container
    listingsContainer.innerHTML = '';
    
    if (sortedListings.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = `No watches found in the "${currentCategory}" category.`;
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
      
      case 'alpha-asc':
        return listingsCopy.sort((a, b) => a.title.localeCompare(b.title));
      
      case 'alpha-desc':
        return listingsCopy.sort((a, b) => b.title.localeCompare(a.title));
      
      case 'newest':
        return listingsCopy.sort((a, b) => {
          // Get listing dates from specifics
          const aDateSpec = a.specifics.find(spec => spec.name === 'Listing Date');
          const bDateSpec = b.specifics.find(spec => spec.name === 'Listing Date');
          
          const aDate = aDateSpec ? new Date(aDateSpec.value) : new Date(0);
          const bDate = bDateSpec ? new Date(bDateSpec.value) : new Date(0);
          
          return bDate - aDate; // Newest first
        });
      
      case 'oldest':
        return listingsCopy.sort((a, b) => {
          // Get listing dates from specifics
          const aDateSpec = a.specifics.find(spec => spec.name === 'Listing Date');
          const bDateSpec = b.specifics.find(spec => spec.name === 'Listing Date');
          
          const aDate = aDateSpec ? new Date(aDateSpec.value) : new Date(0);
          const bDate = bDateSpec ? new Date(bDateSpec.value) : new Date(0);
          
          return aDate - bDate; // Oldest first
        });
      
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
      // Determine if this is a vintage or nineties item
      let era = 'vintage'; // Default to vintage
      
      if (item.specifics && item.specifics.length > 0) {
        // Check for era specific
        const eraSpecific = item.specifics.find(spec => spec.name === 'Era');
        if (eraSpecific) {
          era = eraSpecific.value.toLowerCase();
        } else {
          // If no era specific, try to determine from brand
          const brandSpecific = item.specifics.find(spec => spec.name === 'Brand');
          if (brandSpecific) {
            era = brandSpecific.value === 'Casio' ? 'nineties' : 'vintage';
          }
        }
      }
      
      const card = document.createElement('div');
      card.className = `listing-card ${era}`;
      
      // Get the main image or use placeholder
      let imageUrl = '';
      if (era === 'vintage') {
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/b29059/fff?text=Vintage+Watch';
      } else {
        imageUrl = item.image?.imageUrl || 'https://placehold.co/600x400/ff5987/fff?text=90s+Watch';
      }
      
      // Format specifics if available, excluding Era and Listing Date which we don't want to display
      let specificsHtml = '';
      if (item.specifics && item.specifics.length > 0) {
        specificsHtml = item.specifics
          .filter(spec => spec.name !== 'Era' && spec.name !== 'Listing Date') // Don't show Era or Listing Date
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
      
      // Create HTML for item card with era badge and read more/less functionality
      card.innerHTML = `
        <div class="era-badge ${era}">${era === 'vintage' ? 'WW2 Era' : '90s'}</div>
        <div class="listing-image">
          <img src="${imageUrl}" alt="${item.title}">
        </div>
        <div class="listing-details">
          <h2>${item.title}</h2>
          <p class="price">${item.price.value} ${item.price.currency}</p>
          <div class="item-specifics">
            <div class="description-short" id="${descriptionId}">
              <p>${shortDescription}</p>
              <a href="#" class="read-more-link" id="${readMoreId}">Read more</a>
            </div>
            <div class="description-full" style="display: none;">
              <p>${fullDescription}</p>
              <a href="#" class="read-less-link" id="${readLessId}">Read less</a>
            </div>
            ${specificsHtml}
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
