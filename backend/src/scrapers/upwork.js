import { ApifyClient } from 'apify-client';
import { log } from '../utils/logger.js';
import { getSetting } from '../config/database.js';

/**
 * Scrapes Upwork using Apify (neatrat/upwork-job-scraper)
 */
async function runUpworkScraper(keywords, maxResults = 20) {
  const config = getSetting('skills_profile') || {};
  const apiKey = config.apifyApiKey || process.env.APIFY_API_KEY;
  
  if (!apiKey) {
    log('upwork', 'APIFY_API_KEY not found in config or .env', 'error');
    return [];
  }

  const client = new ApifyClient({ token: apiKey });
  log('upwork', `Starting Apify Upwork scrape for keywords: ${keywords.join(', ')}`);

  try {
    // We use the first keyword as the primary search term
    const searchQuery = keywords.join(' ');
    
    // Actor: neatrat/upwork-job-scraper
    const input = {
      searchQuery: searchQuery,
      sort: 'newest',
      maxItems: maxResults
    };

    log('upwork', `Calling Apify actor with query: "${searchQuery}"...`);
    const run = await client.actor('neatrat/upwork-job-scraper').call(input);
    log('upwork', `Apify actor finished. Fetching dataset ${run.defaultDatasetId}...`);
    
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    const jobs = [];
    const seenUrls = new Set();
    
    items.forEach(job => {
      if (!seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        jobs.push({
          title: job.title || 'Untitled Upwork Job',
          platform: 'upwork',
          url: job.url,
          description: job.description || '',
          budget: job.budget ? `${job.budget}` : (job.hourlyRange || 'Check site'),
          posted_at: job.publishedOn || new Date().toISOString(),
          scraped_at: new Date().toISOString()
        });
      }
    });

    log('upwork', `Successfully found ${jobs.length} unique Upwork jobs via Apify.`, 'success');
    return jobs;
    
  } catch (err) {
    log('upwork', `Apify scrape failed: ${err.message}`, 'error');
    return [];
  }
}

export { runUpworkScraper };
