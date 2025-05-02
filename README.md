# Old Watches - eBay Listings Display

A website for displaying eBay watch listings from seller honey_suckle on the old.watches domain using GitHub Pages.

## About This Repository

This repository contains a simple static website that displays eBay listings for vintage watches. It's designed to be hosted on GitHub Pages and connected to the old.watches custom domain.

## Setup Instructions

### 1. GitHub Repository Setup

1. Make sure you're logged into your GitHub account
2. Create a new repository (or use this one)
3. Enable GitHub Pages in the repository settings:
   - Go to Settings > Pages
   - Set the source to "main" branch
   - Save

### 2. Domain Configuration

To connect your old.watches domain to GitHub Pages:

1. In your GitHub repository, go to Settings > Pages
2. Under "Custom domain", enter: old.watches
3. Click Save
4. Check "Enforce HTTPS" (recommended)

5. At your domain registrar, add these DNS records:
   - A record: @ → 185.199.108.153
   - A record: @ → 185.199.109.153
   - A record: @ → 185.199.110.153
   - A record: @ → 185.199.111.153
   - CNAME record: www → yourusername.github.io

### 3. Updating Listings

In this demo version, the website uses placeholder data. To display your actual eBay listings, you have two options:

#### Option A: Manual Updates

1. Search for your items on eBay
2. Copy the details into the app.js file's mock data section
3. Replace placeholder images with real image URLs

#### Option B: Automated Updates (Advanced)

For a more advanced setup, you could create a GitHub Action that:
1. Runs on a schedule (e.g., daily)
2. Uses a script to fetch your latest eBay listings using the eBay API
3. Generates a listings.json file with the results
4. Commits and pushes the updated file to your repository

## Customization

- **Colors and Styling**: Edit the styles.css file to change colors, fonts, etc.
- **Layout**: Modify the structure in index.html
- **Functionality**: Enhance the JavaScript in app.js

## Files in This Repository

- `index.html` - Main HTML file
- `styles.css` - Styling for the website
- `config.js` - eBay API configuration 
- `app.js` - JavaScript for fetching and displaying listings

## Notes

- This is a static site using client-side JavaScript
- For security reasons, it doesn't directly use your eBay Client Secret
- eBay's API has rate limits that you should be aware of
- The site currently uses placeholder data; you'll need to implement a secure way to fetch your actual listings

## License

This project is available for your personal use.
