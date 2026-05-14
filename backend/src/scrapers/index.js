import { runLinkedInScraper } from './linkedin.js';

import { runUpworkScraper } from './upwork.js';
import { getSetting, insertJobs, logScrape } from '../config/database.js';
import { log, divider } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fallback config if DB fails
const FALLBACK_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'skills.json'), 'utf8')
);

/**
 * Run all configured scrapers based on user settings
 */
async function runAllScrapers() {
  divider('Starting Scraping Cycle');
  
  // Get latest config from DB (or fallback to JSON)
  const dbSettings = getSetting('skills_profile');
  const config = dbSettings || FALLBACK_CONFIG;
  
  const keywords = config.keywords || ['React'];
  const platforms = config.platforms || ['linkedin', 'upwork'];
  const maxResults = config.maxResultsPerPlatform || 20;

  log('system', `Loaded config: ${keywords.length} keywords across ${platforms.join(', ')}`);

  let totalNewJobs = 0;

  // Run in parallel
  const scrapePromises = [];

  if (platforms.includes('linkedin')) {
    scrapePromises.push(
      runLinkedInScraper(keywords, Math.floor(maxResults / keywords.length)).then(jobs => {
        const newCount = insertJobs(jobs);
        logScrape('linkedin', jobs.length, newCount, 0);
        log('linkedin', `Saved ${newCount} new jobs to database`, 'success');
        totalNewJobs += newCount;
      }).catch(err => {
        logScrape('linkedin', 0, 0, 0, err.message);
        log('linkedin', `Scraper failed: ${err.message}`, 'error');
      })
    );
  }



  if (platforms.includes('upwork') || platforms.includes('arbeitnow')) {
    scrapePromises.push(
      runUpworkScraper(keywords, Math.floor(maxResults / keywords.length)).then(jobs => {
        const newCount = insertJobs(jobs);
        logScrape('upwork', jobs.length, newCount, 0);
        log('upwork', `Saved ${newCount} new jobs to database`, 'success');
        totalNewJobs += newCount;
      }).catch(err => {
        logScrape('upwork', 0, 0, 0, err.message);
        log('upwork', `Scraper failed: ${err.message}`, 'error');
      })
    );
  }

  await Promise.allSettled(scrapePromises);
  
  divider();
  log('system', `Scraping cycle completed. Total new jobs found: ${totalNewJobs}`, 'success');
  
  return totalNewJobs;
}

export { runAllScrapers };
