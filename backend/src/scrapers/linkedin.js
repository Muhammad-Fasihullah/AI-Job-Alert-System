// ============================================
//  LinkedIn Job Scraper — Public Guest API
//  No login required, no Puppeteer needed
// ============================================

import axios from 'axios';
import * as cheerio from 'cheerio';
import { log } from '../utils/logger.js';

const BASE_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const JOB_DETAIL_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrape LinkedIn jobs for a given keyword
 * @param {string} keyword - Search keyword
 * @param {number} maxResults - Maximum number of results to fetch
 * @returns {Promise<Array>} Array of job objects
 */
async function scrapeLinkedInJobs(keyword, maxResults = 20) {
  const jobs = [];
  const resultsPerPage = 25;
  let start = 0;

  log('linkedin', `Searching for "${keyword}"...`);

  try {
    while (jobs.length < maxResults) {
      const params = {
        keywords: keyword,
        location: '',
        start: start,
        sortBy: 'DD', // Sort by date (most recent first)
        f_TPR: 'r86400', // Past 24 hours
      };

      const response = await axios.get(BASE_URL, {
        headers: HEADERS,
        params,
        timeout: 15000,
      });

      if (!response.data || response.data.trim() === '') {
        log('linkedin', `No more results for "${keyword}"`, 'warn');
        break;
      }

      const $ = cheerio.load(response.data);
      const jobCards = $('li');

      if (jobCards.length === 0) {
        break;
      }

      jobCards.each((_, element) => {
        if (jobs.length >= maxResults) return false;

        try {
          const $card = $(element);
          const title = $card.find('.base-search-card__title').text().trim();
          const company = $card.find('.base-search-card__subtitle a').text().trim();
          const location = $card.find('.job-search-card__location').text().trim();
          const url = $card.find('.base-card__full-link').attr('href')?.split('?')[0] || '';
          const postedAt = $card.find('.job-search-card__listdate').attr('datetime') || 
                           $card.find('.job-search-card__listdate--new').attr('datetime') || '';

          if (title && url) {
            jobs.push({
              title,
              platform: 'linkedin',
              url: url.trim(),
              description: '', // Will be filled by detail fetch
              budget: 'Not specified',
              skills_required: '',
              client_info: `${company} • ${location}`,
              posted_at: postedAt || new Date().toISOString(),
            });
          }
        } catch (err) {
          // Skip malformed cards
        }
      });

      start += resultsPerPage;
      await sleep(1500); // Rate limit: 1.5s between pages
    }

    // Fetch descriptions for top jobs (limit to avoid too many requests)
    const jobsToEnrich = jobs.slice(0, Math.min(jobs.length, 10));
    for (let i = 0; i < jobsToEnrich.length; i++) {
      try {
        const description = await fetchJobDescription(jobsToEnrich[i].url);
        if (description) {
          jobs[i].description = description;
        }
        await sleep(1000);
      } catch (err) {
        // Skip if description fetch fails
      }
    }

    log('linkedin', `Found ${jobs.length} jobs for "${keyword}"`, 'success');
  } catch (error) {
    log('linkedin', `Error searching "${keyword}": ${error.message}`, 'error');
  }

  return jobs;
}

/**
 * Fetch full job description from LinkedIn job page
 */
async function fetchJobDescription(jobUrl) {
  try {
    // Extract job ID from URL
    const jobIdMatch = jobUrl.match(/(\d+)/);
    if (!jobIdMatch) return '';

    const response = await axios.get(`${JOB_DETAIL_URL}/${jobIdMatch[0]}`, {
      headers: HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const description = $('.description__text, .show-more-less-html__markup')
      .text()
      .trim()
      .substring(0, 2000); // Limit description length

    return description;
  } catch {
    return '';
  }
}

/**
 * Run LinkedIn scraper for multiple keywords
 * @param {string[]} keywords - Array of keywords to search
 * @param {number} maxPerKeyword - Max results per keyword
 * @returns {Promise<Array>} All scraped jobs
 */
async function runLinkedInScraper(keywords, maxPerKeyword = 10) {
  log('linkedin', `Starting scrape for ${keywords.length} keywords...`);
  const allJobs = [];
  const seenUrls = new Set();

  for (const keyword of keywords) {
    const jobs = await scrapeLinkedInJobs(keyword, maxPerKeyword);

    // Deduplicate within this scrape run
    for (const job of jobs) {
      if (!seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        allJobs.push(job);
      }
    }

    await sleep(2000); // Wait between keyword searches
  }

  log('linkedin', `Total unique jobs scraped: ${allJobs.length}`, 'success');
  return allJobs;
}

export { runLinkedInScraper, scrapeLinkedInJobs };
