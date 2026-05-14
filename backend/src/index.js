// ============================================
//  Main Entrypoint
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { banner, log } from './utils/logger.js';
import { initDatabase } from './config/database.js';
import { runAllScrapers } from './scrapers/index.js';
import { scoreJobsBatch } from './ai/gemini.js';
import { getUnscoredJobs, updateJobScore, deleteJob, getUnalertedHighScoreJobs, getSetting } from './config/database.js';
import { sendJobAlerts } from './alerts/email.js';

import jobsRouter from './routes/jobs.js';
import settingsRouter from './routes/settings.js';

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/settings', settingsRouter);

// Manual trigger endpoint
app.post('/api/run', async (req, res) => {
  log('system', 'Manual scrape triggered via API', 'warn');
  res.json({ success: true, message: 'Scraping started in background' });
  
  try {
    const newJobs = await runAllScrapers();
    
    // Phase 2: AI Scoring
    const unscoredJobs = getUnscoredJobs(50); // Process up to 50 unscored jobs
    if (unscoredJobs.length > 0) {
      log('system', `Found ${unscoredJobs.length} unscored jobs. Sending to Gemini...`);
      const scoredResults = await scoreJobsBatch(unscoredJobs);
      
      let highScoreCount = 0;
      for (const res of scoredResults) {
        if (res.score < 5) {
          deleteJob(res.jobId);
          log('system', `Removed low-score job (${res.score}/10)`);
        } else {
          updateJobScore(res.jobId, res.score, res.matchedSkills, res.proposalSnippet, res.reasoning);
          if (res.score >= 7) highScoreCount++;
        }
      }
      log('system', `Scoring complete. Found ${highScoreCount} highly relevant jobs (Score >= 7).`, 'success');
    }
    
    // Phase 3: Alerts
    const profile = getSetting('skills_profile');
    const threshold = profile?.alertThreshold || 7;
    const alertableJobs = getUnalertedHighScoreJobs(threshold);
    
    if (alertableJobs.length > 0) {
      log('system', `Found ${alertableJobs.length} new jobs scoring >= ${threshold}. Sending alerts...`);
      await sendJobAlerts(alertableJobs);
    } else {
      log('system', 'No new high-scoring jobs to alert.');
    }
    
  } catch (err) {
    log('system', `Scrape failed: ${err.message}`, 'error');
  }
});

// Start Server
async function start() {
  banner();
  
  // 1. Init DB
  initDatabase();
  
  // 2. Start Express
  app.listen(PORT, () => {
    log('system', `Server running on http://localhost:${PORT}`, 'success');
  });

  // 3. Setup Cron Job
  const interval = process.env.SCRAPE_INTERVAL_MINUTES || 15;
  log('system', `Scheduler setup: Running every ${interval} minutes`);
  
  cron.schedule(`*/${interval} * * * *`, async () => {
    log('system', `Cron triggered — starting scrape cycle`);
    try {
      const newJobs = await runAllScrapers();
      
      // Phase 2: AI Scoring
      const unscoredJobs = getUnscoredJobs(50);
      if (unscoredJobs.length > 0) {
        const scoredResults = await scoreJobsBatch(unscoredJobs);
        for (const res of scoredResults) {
          if (res.score < 5) {
            deleteJob(res.jobId);
          } else {
            updateJobScore(res.jobId, res.score, res.matchedSkills, res.proposalSnippet, res.reasoning);
          }
        }
      }

      // Phase 3: Alerts
      const profile = getSetting('skills_profile');
      const threshold = profile?.alertThreshold || 7;
      const alertableJobs = getUnalertedHighScoreJobs(threshold);
      
      if (alertableJobs.length > 0) {
        log('system', `Found ${alertableJobs.length} new jobs scoring >= ${threshold}. Sending alerts...`);
        await sendJobAlerts(alertableJobs);
      }

    } catch (err) {
      log('system', `Cron scrape failed: ${err.message}`, 'error');
    }
  });
}

start();
